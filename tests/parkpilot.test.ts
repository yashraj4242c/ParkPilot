import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import EmbeddedPostgres from "embedded-postgres";
import Stripe from "stripe";
import request from "supertest";
import bcrypt from "bcryptjs";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const TEST_PORT = 5434;
const TEST_DB_NAME = "parkpilot_test";
const TEST_DB_URL = `postgresql://postgres:postgres@127.0.0.1:${TEST_PORT}/${TEST_DB_NAME}?schema=public`;
const TEST_PG_DIR = path.resolve(process.cwd(), ".local-pg-test");

let pg: EmbeddedPostgres;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let app: any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let prisma: any;

function futureIstWindow(daysAhead: number, startHourIst: number, endHourIst: number) {
  // Construct deterministic future date in IST (+05:30)
  const base = new Date(Date.now() + daysAhead * 24 * 60 * 60 * 1000);
  const y = base.getUTCFullYear();
  const m = String(base.getUTCMonth() + 1).padStart(2, "0");
  const d = String(base.getUTCDate()).padStart(2, "0");
  const sh = String(startHourIst).padStart(2, "0");
  const eh = String(endHourIst).padStart(2, "0");
  return {
    startTime: new Date(`${y}-${m}-${d}T${sh}:00:00+05:30`).toISOString(),
    endTime: new Date(`${y}-${m}-${d}T${eh}:00:00+05:30`).toISOString(),
  };
}

describe("ParkPilot End-to-End API & Concurrency Suite", () => {
  beforeAll(async () => {
    fs.rmSync(TEST_PG_DIR, { recursive: true, force: true });

    pg = new EmbeddedPostgres({
      databaseDir: TEST_PG_DIR,
      user: "postgres",
      password: "postgres",
      port: TEST_PORT,
      persistent: false,
    });

    await pg.initialise();
    await pg.start();
    await pg.createDatabase(TEST_DB_NAME);

    process.env.NODE_ENV = "test";
    process.env.DATABASE_URL = TEST_DB_URL;
    process.env.DIRECT_URL = TEST_DB_URL;
    process.env.JWT_SECRET = "test-suite-jwt-secret-at-least-32-chars";
    process.env.ENABLE_DEV_PAYMENT_MODE = "true";
    process.env.STRIPE_SECRET_KEY = "";
    process.env.STRIPE_WEBHOOK_SECRET = "";
    process.env.RESEND_API_KEY = "";

    execSync("npx prisma migrate deploy", {
      stdio: "inherit",
      env: { ...process.env, DATABASE_URL: TEST_DB_URL, DIRECT_URL: TEST_DB_URL },
    });

    const appMod = await import("../server/app.js");
    const prismaMod = await import("../server/lib/prisma.js");
    app = appMod.createApp();
    prisma = prismaMod.prisma;

    const adminHash = await bcrypt.hash("AdminTest123!", 10);
    await prisma.user.create({
      data: {
        email: "admin@test.local",
        name: "Test Admin",
        passwordHash: adminHash,
        role: "ADMIN",
      },
    });
  });

  afterAll(async () => {
    if (prisma) {
      await prisma.$disconnect();
    }
    if (pg) {
      await pg.stop();
    }
    fs.rmSync(TEST_PG_DIR, { recursive: true, force: true });
  });

  it("enforces authentication, cookies, profile editing, and RBAC boundaries", async () => {
    const driverAgent = request.agent(app);
    const ownerAgent = request.agent(app);
    const adminAgent = request.agent(app);

    const driverRes = await driverAgent.post("/api/auth/signup").send({
      email: "driver1@test.local",
      password: "Password123!",
      name: "Driver One",
      role: "DRIVER",
    });
    expect(driverRes.status).toBe(201);
    expect(driverRes.headers["set-cookie"]).toBeDefined();

    // Driver cannot access owner or admin endpoints
    const driverToOwner = await driverAgent.get("/api/owner/listings");
    expect(driverToOwner.status).toBe(403);

    const driverToAdmin = await driverAgent.get("/api/admin/overview");
    expect(driverToAdmin.status).toBe(403);

    // Unauthenticated gets 401
    const unauth = await request(app).get("/api/bookings/my");
    expect(unauth.status).toBe(401);

    // Owner signup & profile update
    const ownerRes = await ownerAgent.post("/api/auth/signup").send({
      email: "owner1@test.local",
      password: "Password123!",
      name: "Owner One",
      role: "OWNER",
    });
    expect(ownerRes.status).toBe(201);

    const profileUpdate = await driverAgent
      .patch("/api/auth/me")
      .send({ name: "Driver One Updated", phone: "+91 99999 00000" });
    expect(profileUpdate.status).toBe(200);
    expect(profileUpdate.body.data.user.name).toBe("Driver One Updated");

    // Admin login
    const adminLogin = await adminAgent.post("/api/auth/login").send({
      email: "admin@test.local",
      password: "AdminTest123!",
    });
    expect(adminLogin.status).toBe(200);

    const adminOverview = await adminAgent.get("/api/admin/overview");
    expect(adminOverview.status).toBe(200);
    expect(adminOverview.body.data.users.length).toBeGreaterThanOrEqual(3);
  });

  it("prevents overlapping bookings, allows adjacent slots, and handles concurrent races safely", async () => {
    const ownerAgent = request.agent(app);
    const driver1Agent = request.agent(app);
    const driver2Agent = request.agent(app);

    await ownerAgent.post("/api/auth/login").send({
      email: "owner1@test.local",
      password: "Password123!",
    });
    await driver1Agent.post("/api/auth/login").send({
      email: "driver1@test.local",
      password: "Password123!",
    });
    await driver2Agent.post("/api/auth/signup").send({
      email: "driver2@test.local",
      password: "Password123!",
      name: "Driver Two",
      role: "DRIVER",
    });

    // Owner creates listing (100 INR/hr = 10000 paise)
    const createListingRes = await ownerAgent.post("/api/owner/listings").send({
      title: "Test Indiranagar Covered Slot",
      description: "Clean covered parking slot with security guard.",
      addressLine: "123 12th Main",
      area: "Indiranagar",
      city: "Bengaluru",
      parkingType: "COVERED",
      pricePerHourPaise: 10000,
      availableFromHour: 6,
      availableToHour: 22,
    });
    expect(createListingRes.status).toBe(201);
    const listingId = createListingRes.body.data.listing.id;

    // 1. Primary booking: 10:00 - 12:00 IST (2 hours = 20000 paise)
    const win1 = futureIstWindow(3, 10, 12);
    const b1 = await driver1Agent.post("/api/bookings").send({
      listingId,
      startTime: win1.startTime,
      endTime: win1.endTime,
      totalAmountPaise: 1, // Should be ignored by server!
    });
    expect(b1.status).toBe(201);
    expect(b1.body.data.booking.totalAmountPaise).toBe(20000);
    const booking1Id = b1.body.data.booking.id;

    // Confirm b1 via dev test payment
    const confirm1 = await driver1Agent
      .post("/api/payments/dev-confirm")
      .send({ bookingId: booking1Id });
    expect(confirm1.status).toBe(200);
    expect(confirm1.body.data.booking.status).toBe("CONFIRMED");

    // 2. Overlapping booking: 11:00 - 13:00 IST -> MUST BE REJECTED (409)
    const winOverlap = futureIstWindow(3, 11, 13);
    const bOverlap = await driver2Agent.post("/api/bookings").send({
      listingId,
      startTime: winOverlap.startTime,
      endTime: winOverlap.endTime,
    });
    expect(bOverlap.status).toBe(409);

    // 3. Adjacent booking: 12:00 - 14:00 IST -> MUST BE ALLOWED (201)
    const winAdjacent = futureIstWindow(3, 12, 14);
    const bAdjacent = await driver2Agent.post("/api/bookings").send({
      listingId,
      startTime: winAdjacent.startTime,
      endTime: winAdjacent.endTime,
    });
    expect(bAdjacent.status).toBe(201);

    // 4. Concurrent race condition: 5 parallel requests for 15:00 - 17:00 IST
    const winRace = futureIstWindow(3, 15, 17);
    const raceResults = await Promise.all(
      Array.from({ length: 5 }, () =>
        driver2Agent.post("/api/bookings").send({
          listingId,
          startTime: winRace.startTime,
          endTime: winRace.endTime,
        })
      )
    );
    const createdCount = raceResults.filter((r) => r.status === 201).length;
    const conflictCount = raceResults.filter((r) => r.status === 409).length;
    expect(createdCount).toBe(1);
    expect(conflictCount).toBe(4);
  });

  it("expires unpaid holds automatically, releases availability, and enforces cancellation refunds", async () => {
    const ownerAgent = request.agent(app);
    const driver1Agent = request.agent(app);
    const driver2Agent = request.agent(app);

    await ownerAgent.post("/api/auth/login").send({
      email: "owner1@test.local",
      password: "Password123!",
    });
    await driver1Agent.post("/api/auth/login").send({
      email: "driver1@test.local",
      password: "Password123!",
    });
    await driver2Agent.post("/api/auth/login").send({
      email: "driver2@test.local",
      password: "Password123!",
    });

    const listingsRes = await ownerAgent.get("/api/owner/listings");
    const listingId = listingsRes.body.data.listings[0].id;

    // Create hold on day 4, 09:00 - 11:00 IST
    const winHold = futureIstWindow(4, 9, 11);
    const holdRes = await driver1Agent.post("/api/bookings").send({
      listingId,
      startTime: winHold.startTime,
      endTime: winHold.endTime,
    });
    expect(holdRes.status).toBe(201);
    const holdId = holdRes.body.data.booking.id;

    // Simulate hold expiration in DB
    await prisma.booking.update({
      where: { id: holdId },
      data: { holdExpiresAt: new Date(Date.now() - 60_000) },
    });

    // Attempting dev-confirm on expired hold must fail
    const confirmExpired = await driver1Agent
      .post("/api/payments/dev-confirm")
      .send({ bookingId: holdId });
    expect(confirmExpired.status).toBe(409);

    // Another driver can now book the exact same window cleanly
    const rebookRes = await driver2Agent.post("/api/bookings").send({
      listingId,
      startTime: winHold.startTime,
      endTime: winHold.endTime,
    });
    expect(rebookRes.status).toBe(201);
    const rebookId = rebookRes.body.data.booking.id;

    await driver2Agent
      .post("/api/payments/dev-confirm")
      .send({ bookingId: rebookId });

    // Owner cannot delete listing while confirmed booking exists
    const deleteBlocked = await ownerAgent.delete(
      `/api/owner/listings/${listingId}`
    );
    expect(deleteBlocked.status).toBe(409);

    // Driver 2 cancels >= 2h before arrival -> 100% refund & slot released
    const cancelRes = await driver2Agent
      .post(`/api/bookings/${rebookId}/cancel`)
      .send({ reason: "Plans changed" });
    expect(cancelRes.status).toBe(200);
    expect(cancelRes.body.data.booking.status).toBe("CANCELLED");
    expect(cancelRes.body.data.eligibleRefundPaise).toBe(20000);

    // Availability endpoint now shows the slot is free again
    const availRes = await request(app)
      .get(`/api/listings/${listingId}/availability`)
      .query({ startTime: winHold.startTime, endTime: winHold.endTime });
    expect(availRes.status).toBe(200);
    expect(availRes.body.data.available).toBe(true);
  });

  it("verifies Stripe webhook signatures and processes checkout.session.completed idempotently", async () => {
    const configMod = await import("../server/config.js");
    configMod.config.stripeSecretKey = "sk_test_mock_key_for_unit_test";
    configMod.config.stripeWebhookSecret = "whsec_test_mock_secret";

    const stripe = new Stripe("sk_test_mock_key_for_unit_test");

    const ownerAgent = request.agent(app);
    const driver1Agent = request.agent(app);

    await ownerAgent.post("/api/auth/login").send({
      email: "owner1@test.local",
      password: "Password123!",
    });
    await driver1Agent.post("/api/auth/login").send({
      email: "driver1@test.local",
      password: "Password123!",
    });

    const listingsRes = await ownerAgent.get("/api/owner/listings");
    const listingId = listingsRes.body.data.listings[0].id;

    const win = futureIstWindow(5, 10, 12);
    const bookingRes = await driver1Agent.post("/api/bookings").send({
      listingId,
      startTime: win.startTime,
      endTime: win.endTime,
    });
    expect(bookingRes.status).toBe(201);
    const bookingId = bookingRes.body.data.booking.id;

    // Invalid signature rejected
    const badSig = await request(app)
      .post("/api/payments/webhook")
      .set("Stripe-Signature", "t=123,v1=invalid")
      .set("Content-Type", "application/json")
      .send(JSON.stringify({ id: "evt_bad", type: "checkout.session.completed" }));
    expect(badSig.status).toBe(400);

    // Valid signed webhook payload
    const payload = JSON.stringify({
      id: "evt_test_checkout_1",
      object: "event",
      type: "checkout.session.completed",
      data: {
        object: {
          id: "cs_test_12345",
          object: "checkout.session",
          payment_status: "paid",
          payment_intent: "pi_test_12345",
          metadata: { bookingId },
        },
      },
    });

    const header = stripe.webhooks.generateTestHeaderString({
      payload,
      secret: "whsec_test_mock_secret",
    });

    const goodWebhook = await request(app)
      .post("/api/payments/webhook")
      .set("Stripe-Signature", header)
      .set("Content-Type", "application/json")
      .send(payload);
    expect(goodWebhook.status).toBe(200);
    expect(goodWebhook.body.received).toBe(true);

    // Replay same webhook -> idempotent
    const replayWebhook = await request(app)
      .post("/api/payments/webhook")
      .set("Stripe-Signature", header)
      .set("Content-Type", "application/json")
      .send(payload);
    expect(replayWebhook.status).toBe(200);

    const updatedBooking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { payment: true },
    });
    expect(updatedBooking.status).toBe("CONFIRMED");
    expect(updatedBooking.payment.status).toBe("SUCCEEDED");
    expect(updatedBooking.payment.stripePaymentIntentId).toBe("pi_test_12345");
  });
});
