import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { AppError, asyncHandler } from "../lib/errors.js";
import { requireAuth } from "../lib/auth.js";
import {
  calculateCancellationRefund,
  cancelBooking,
  createBookingHold,
  expireStaleHolds,
} from "../services/bookingService.js";
import { config } from "../config.js";

const router = Router();

const createBookingSchema = z.object({
  listingId: z.string().min(1, "Listing ID is required."),
  startTime: z.string().min(1, "Arrival time is required."),
  endTime: z.string().min(1, "Departure time is required."),
  vehicleNumber: z
    .string()
    .trim()
    .max(24, "Vehicle registration is too long.")
    .optional(),
  notes: z.string().trim().max(300, "Notes are too long.").optional(),
});

const cancelBookingSchema = z.object({
  reason: z.string().trim().max(300).optional(),
});

router.post(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    const data = createBookingSchema.parse(req.body);
    const booking = await createBookingHold({
      listingId: data.listingId,
      driverId: req.user!.id,
      startTime: new Date(data.startTime),
      endTime: new Date(data.endTime),
      vehicleNumber: data.vehicleNumber,
      notes: data.notes,
    });

    res.status(201).json({
      success: true,
      data: { booking },
    });
  })
);

router.get(
  "/my",
  requireAuth,
  asyncHandler(async (req, res) => {
    await expireStaleHolds();

    const bookings = await prisma.booking.findMany({
      where: { driverId: req.user!.id },
      orderBy: { startTime: "desc" },
      include: {
        listing: {
          select: {
            id: true,
            title: true,
            addressLine: true,
            area: true,
            city: true,
            parkingType: true,
            instructions: true,
            pricePerHourPaise: true,
          },
        },
        payment: {
          select: {
            id: true,
            provider: true,
            status: true,
            amountPaise: true,
            refundedAmountPaise: true,
            paidAt: true,
            refundedAt: true,
          },
        },
      },
    });

    const enriched = bookings.map((b) => ({
      ...b,
      cancellationPreview: calculateCancellationRefund(b, req.user!.role),
    }));

    res.json({
      success: true,
      data: {
        bookings: enriched,
        policy: config.cancellationPolicy,
      },
    });
  })
);

router.get(
  "/:id",
  requireAuth,
  asyncHandler(async (req, res) => {
    await expireStaleHolds();

    const booking = await prisma.booking.findUnique({
      where: { id: req.params.id },
      include: {
        listing: {
          select: {
            id: true,
            ownerId: true,
            title: true,
            addressLine: true,
            area: true,
            city: true,
            parkingType: true,
            instructions: true,
            pricePerHourPaise: true,
          },
        },
        payment: true,
        driver: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    if (!booking) {
      throw new AppError(404, "Booking not found.", "BOOKING_NOT_FOUND");
    }

    const isDriver = booking.driverId === req.user!.id;
    const isOwner = booking.listing.ownerId === req.user!.id;
    const isAdmin = req.user!.role === "ADMIN";

    if (!isDriver && !isOwner && !isAdmin) {
      throw new AppError(
        403,
        "You do not have permission to view this booking.",
        "FORBIDDEN"
      );
    }

    res.json({
      success: true,
      data: {
        booking: {
          ...booking,
          cancellationPreview: calculateCancellationRefund(
            booking,
            req.user!.role
          ),
        },
        policy: config.cancellationPolicy,
      },
    });
  })
);

router.post(
  "/:id/cancel",
  requireAuth,
  asyncHandler(async (req, res) => {
    const body = cancelBookingSchema.parse(req.body ?? {});
    const result = await cancelBooking({
      bookingId: req.params.id,
      actorId: req.user!.id,
      actorRole: req.user!.role,
      reason: body.reason,
    });

    res.json({
      success: true,
      data: result,
    });
  })
);

export default router;
