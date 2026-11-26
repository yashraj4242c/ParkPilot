import { Router } from "express";
import type { Request, Response } from "express";
import { BookingStatus, PaymentProvider, PaymentStatus } from "@prisma/client";
import { z } from "zod";
import { config, isStripeConfigured } from "../config.js";
import { requireAuth } from "../lib/auth.js";
import { AppError, asyncHandler } from "../lib/errors.js";
import { prisma } from "../lib/prisma.js";
import {
  confirmBookingPayment,
  expireStaleHolds,
} from "../services/bookingService.js";
import { getStripeClient } from "../services/stripeService.js";

const router = Router();

const checkoutSchema = z.object({
  bookingId: z.string().min(1, "Booking ID is required."),
});

router.get("/config", (_req, res) => {
  res.json({
    success: true,
    data: {
      stripeConfigured: isStripeConfigured(),
      devPaymentMode: config.enableDevPaymentMode,
      publishableKey: config.stripePublishableKey || null,
    },
  });
});

router.post(
  "/checkout",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { bookingId } = checkoutSchema.parse(req.body);

    await expireStaleHolds();

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        listing: {
          select: {
            id: true,
            title: true,
            area: true,
            city: true,
          },
        },
        payment: true,
      },
    });

    if (!booking) {
      throw new AppError(404, "Booking not found.", "BOOKING_NOT_FOUND");
    }

    if (booking.driverId !== req.user!.id) {
      throw new AppError(
        403,
        "You can only pay for your own booking.",
        "FORBIDDEN"
      );
    }

    if (booking.status === BookingStatus.CONFIRMED) {
      res.json({
        success: true,
        data: {
          mode: "already_confirmed",
          bookingId: booking.id,
        },
      });
      return;
    }

    if (booking.status !== BookingStatus.PENDING_PAYMENT) {
      throw new AppError(
        409,
        `Booking cannot be paid because its status is ${booking.status}.`,
        "BOOKING_NOT_PAYABLE"
      );
    }

    if (booking.holdExpiresAt && booking.holdExpiresAt <= new Date()) {
      await expireStaleHolds(prisma, booking.listingId);
      throw new AppError(
        409,
        "Your reservation hold expired before payment started. Please book again.",
        "HOLD_EXPIRED"
      );
    }

    const stripe = getStripeClient();
    if (!stripe) {
      if (!config.enableDevPaymentMode) {
        throw new AppError(
          503,
          "Online payments are not configured on this server.",
          "PAYMENTS_UNAVAILABLE"
        );
      }

      res.json({
        success: true,
        data: {
          mode: "dev_test",
          bookingId: booking.id,
          amountPaise: booking.totalAmountPaise,
          currency: booking.currency,
          message:
            "Stripe is not configured. Use the local development test payment flow (not a real charge).",
        },
      });
      return;
    }

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      customer_email: req.user!.email,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: booking.currency.toLowerCase(),
            unit_amount: booking.totalAmountPaise,
            product_data: {
              name: `Parking: ${booking.listing.title}`,
              description: `${booking.listing.area}, ${booking.listing.city} (${booking.reference})`,
            },
          },
        },
      ],
      metadata: {
        bookingId: booking.id,
        bookingReference: booking.reference,
        driverId: req.user!.id,
      },
      success_url: `${config.appUrl}/bookings/${booking.id}?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${config.appUrl}/bookings/${booking.id}?checkout=cancelled`,
    });

    await prisma.payment.update({
      where: { bookingId: booking.id },
      data: {
        provider: PaymentProvider.STRIPE,
        stripeSessionId: session.id,
      },
    });

    res.json({
      success: true,
      data: {
        mode: "stripe",
        checkoutUrl: session.url,
        sessionId: session.id,
      },
    });
  })
);

router.post(
  "/dev-confirm",
  requireAuth,
  asyncHandler(async (req, res) => {
    if (!config.enableDevPaymentMode) {
      throw new AppError(
        403,
        "Local development payment simulation is disabled.",
        "DEV_PAYMENT_DISABLED"
      );
    }

    const { bookingId } = checkoutSchema.parse(req.body);
    const existing = await prisma.booking.findUnique({
      where: { id: bookingId },
      select: { id: true, driverId: true },
    });

    if (!existing) {
      throw new AppError(404, "Booking not found.", "BOOKING_NOT_FOUND");
    }

    if (existing.driverId !== req.user!.id) {
      throw new AppError(
        403,
        "You can only confirm your own booking.",
        "FORBIDDEN"
      );
    }

    const result = await confirmBookingPayment({
      bookingId,
      provider: PaymentProvider.DEV_TEST,
      isDevTestConfirmation: true,
    });

    res.json({
      success: true,
      data: {
        booking: result.booking,
        mode: "dev_test",
      },
    });
  })
);

router.post(
  "/verify-session",
  requireAuth,
  asyncHandler(async (req, res) => {
    const schema = z.object({
      bookingId: z.string().min(1),
      sessionId: z.string().min(1),
    });
    const { bookingId, sessionId } = schema.parse(req.body);

    const stripe = getStripeClient();
    if (!stripe) {
      throw new AppError(503, "Stripe is not configured.", "STRIPE_NOT_CONFIGURED");
    }

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { payment: true },
    });

    if (!booking || booking.driverId !== req.user!.id) {
      throw new AppError(404, "Booking not found.", "BOOKING_NOT_FOUND");
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (session.metadata?.bookingId !== booking.id) {
      throw new AppError(400, "Session does not match booking.", "SESSION_MISMATCH");
    }

    if (session.payment_status === "paid") {
      const paymentIntentId =
        typeof session.payment_intent === "string"
          ? session.payment_intent
          : session.payment_intent?.id;

      const confirmed = await confirmBookingPayment({
        bookingId: booking.id,
        provider: PaymentProvider.STRIPE,
        stripeSessionId: session.id,
        stripePaymentIntentId: paymentIntentId,
      });

      res.json({
        success: true,
        data: {
          status: "paid",
          booking: confirmed.booking,
        },
      });
      return;
    }

    res.json({
      success: true,
      data: {
        status: session.payment_status,
        booking,
      },
    });
  })
);

export async function stripeWebhookHandler(
  req: Request,
  res: Response
): Promise<void> {
  const stripe = getStripeClient();
  if (!stripe || !config.stripeWebhookSecret) {
    res.status(503).json({
      success: false,
      error: {
        code: "WEBHOOK_NOT_CONFIGURED",
        message: "Stripe webhook secret is not configured.",
      },
    });
    return;
  }

  const signature = req.headers["stripe-signature"];
  if (!signature || typeof signature !== "string") {
    res.status(400).json({
      success: false,
      error: {
        code: "MISSING_SIGNATURE",
        message: "Missing Stripe-Signature header.",
      },
    });
    return;
  }

  const rawBody = Buffer.isBuffer(req.body)
    ? req.body
    : req.rawBody
      ? req.rawBody
      : Buffer.from(JSON.stringify(req.body));

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      config.stripeWebhookSecret
    );
  } catch (err) {
    res.status(400).json({
      success: false,
      error: {
        code: "INVALID_SIGNATURE",
        message:
          err instanceof Error ? err.message : "Invalid webhook signature.",
      },
    });
    return;
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        const bookingId = session.metadata?.bookingId;
        if (bookingId && session.payment_status === "paid") {
          const paymentIntentId =
            typeof session.payment_intent === "string"
              ? session.payment_intent
              : session.payment_intent?.id;
          await confirmBookingPayment({
            bookingId,
            provider: PaymentProvider.STRIPE,
            stripeSessionId: session.id,
            stripePaymentIntentId: paymentIntentId,
            webhookEventId: event.id,
          });
        }
        break;
      }

      case "checkout.session.expired": {
        const session = event.data.object;
        const bookingId = session.metadata?.bookingId;
        if (bookingId) {
          await prisma.$transaction(async (tx) => {
            const b = await tx.booking.findUnique({ where: { id: bookingId } });
            if (b && b.status === BookingStatus.PENDING_PAYMENT) {
              await tx.booking.update({
                where: { id: bookingId },
                data: { status: BookingStatus.EXPIRED, holdExpiresAt: null },
              });
              await tx.payment.updateMany({
                where: { bookingId, status: PaymentStatus.PENDING },
                data: {
                  status: PaymentStatus.CANCELLED,
                  lastWebhookEventId: event.id,
                },
              });
            }
          });
        }
        break;
      }

      case "payment_intent.payment_failed": {
        const pi = event.data.object;
        const payment = await prisma.payment.findFirst({
          where: { stripePaymentIntentId: pi.id },
        });
        if (payment && payment.status === PaymentStatus.PENDING) {
          await prisma.payment.update({
            where: { id: payment.id },
            data: {
              status: PaymentStatus.FAILED,
              lastWebhookEventId: event.id,
            },
          });
        }
        break;
      }

      case "charge.refunded": {
        const charge = event.data.object;
        const piId =
          typeof charge.payment_intent === "string"
            ? charge.payment_intent
            : charge.payment_intent?.id;
        if (piId) {
          const payment = await prisma.payment.findFirst({
            where: { stripePaymentIntentId: piId },
          });
          if (payment) {
            const refundedAmount = charge.amount_refunded;
            const nextStatus =
              refundedAmount >= payment.amountPaise
                ? PaymentStatus.REFUNDED
                : PaymentStatus.PARTIALLY_REFUNDED;

            await prisma.$transaction(async (tx) => {
              await tx.payment.update({
                where: { id: payment.id },
                data: {
                  status: nextStatus,
                  refundedAmountPaise: refundedAmount,
                  refundedAt: new Date(),
                  lastWebhookEventId: event.id,
                },
              });
              await tx.booking.update({
                where: { id: payment.bookingId },
                data: { refundAmountPaise: refundedAmount },
              });
            });
          }
        }
        break;
      }

      default:
        break;
    }

    res.json({ received: true });
  } catch (err) {
    console.error("Webhook processing error:", err);
    res.status(500).json({
      success: false,
      error: {
        code: "WEBHOOK_PROCESSING_ERROR",
        message: "Failed to process webhook event.",
      },
    });
  }
}

export default router;
