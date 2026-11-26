import crypto from "node:crypto";
import {
  BookingStatus,
  PaymentProvider,
  PaymentStatus,
  Prisma,
  UserRole,
} from "@prisma/client";
import { config, isStripeConfigured } from "../config.js";
import { AppError, isExclusionConstraintError } from "../lib/errors.js";
import { prisma } from "../lib/prisma.js";
import {
  calculateBookingPricePaise,
  isWithinOperatingHours,
} from "../lib/pricing.js";
import { getStripeClient } from "./stripeService.js";
import {
  sendBookingCancellationEmail,
  sendBookingConfirmationEmail,
} from "./emailService.js";

function generateBookingReference(): string {
  const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const randPart = crypto.randomBytes(3).toString("hex").toUpperCase();
  return `PP-${datePart}-${randPart}`;
}

export async function expireStaleHolds(
  db: Prisma.TransactionClient | typeof prisma = prisma,
  listingId?: string
): Promise<number> {
  const now = new Date();
  const whereClause: Prisma.BookingWhereInput = {
    status: BookingStatus.PENDING_PAYMENT,
    holdExpiresAt: { lte: now },
    ...(listingId ? { listingId } : {}),
  };

  const staleBookings = await db.booking.findMany({
    where: whereClause,
    select: { id: true },
  });

  if (staleBookings.length === 0) {
    return 0;
  }

  const ids = staleBookings.map((b) => b.id);

  await db.booking.updateMany({
    where: {
      id: { in: ids },
      status: BookingStatus.PENDING_PAYMENT,
    },
    data: {
      status: BookingStatus.EXPIRED,
    },
  });

  await db.payment.updateMany({
    where: {
      bookingId: { in: ids },
      status: PaymentStatus.PENDING,
    },
    data: {
      status: PaymentStatus.CANCELLED,
    },
  });

  return ids.length;
}

export async function getListingAvailability(
  listingId: string,
  startTime: Date,
  endTime: Date
) {
  if (Number.isNaN(startTime.getTime()) || Number.isNaN(endTime.getTime())) {
    throw new AppError(400, "Invalid arrival or departure time.", "INVALID_DATES");
  }
  if (endTime <= startTime) {
    throw new AppError(
      400,
      "Departure time must be after arrival time.",
      "INVALID_DATES"
    );
  }

  await expireStaleHolds(prisma, listingId);

  const listing = await prisma.parkingListing.findUnique({
    where: { id: listingId },
    select: {
      id: true,
      isActive: true,
      isApproved: true,
      pricePerHourPaise: true,
      currency: true,
      availableFromHour: true,
      availableToHour: true,
    },
  });

  if (!listing) {
    throw new AppError(404, "Parking listing not found.", "LISTING_NOT_FOUND");
  }

  const isPublished = listing.isActive && listing.isApproved;
  const withinHours = isWithinOperatingHours(
    startTime,
    endTime,
    listing.availableFromHour,
    listing.availableToHour
  );

  const overlappingCount = await prisma.booking.count({
    where: {
      listingId,
      status: { in: [BookingStatus.PENDING_PAYMENT, BookingStatus.CONFIRMED] },
      startTime: { lt: endTime },
      endTime: { gt: startTime },
    },
  });

  const upcomingReservedSlots = await prisma.booking.findMany({
    where: {
      listingId,
      status: { in: [BookingStatus.PENDING_PAYMENT, BookingStatus.CONFIRMED] },
      endTime: { gt: new Date() },
    },
    orderBy: { startTime: "asc" },
    take: 25,
    select: {
      startTime: true,
      endTime: true,
      status: true,
    },
  });

  let pricing: { durationMinutes: number; totalAmountPaise: number } | null =
    null;
  let durationError: string | null = null;
  try {
    pricing = calculateBookingPricePaise(
      startTime,
      endTime,
      listing.pricePerHourPaise
    );
  } catch (err) {
    durationError =
      err instanceof AppError ? err.message : "Invalid booking duration.";
  }

  const available =
    isPublished && withinHours && overlappingCount === 0 && pricing !== null;

  let reason: string | null = null;
  if (!isPublished) {
    reason = "This listing is currently paused or unavailable.";
  } else if (!withinHours) {
    reason = `Listing operates daily between ${String(listing.availableFromHour).padStart(2, "0")}:00 and ${String(listing.availableToHour).padStart(2, "0")}:00 IST.`;
  } else if (durationError) {
    reason = durationError;
  } else if (overlappingCount > 0) {
    reason = "Selected time overlaps with an existing reservation or hold.";
  }

  return {
    available,
    reason,
    pricing,
    currency: listing.currency,
    upcomingReservedSlots,
    checkedAt: new Date().toISOString(),
  };
}

export async function createBookingHold(input: {
  listingId: string;
  driverId: string;
  startTime: Date;
  endTime: Date;
  vehicleNumber?: string;
  notes?: string;
}) {
  const { listingId, driverId, startTime, endTime, vehicleNumber, notes } =
    input;

  if (Number.isNaN(startTime.getTime()) || Number.isNaN(endTime.getTime())) {
    throw new AppError(400, "Invalid arrival or departure time.", "INVALID_DATES");
  }
  if (endTime <= startTime) {
    throw new AppError(
      400,
      "Departure time must be after arrival time.",
      "INVALID_DATES"
    );
  }

  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
  if (startTime < fiveMinutesAgo) {
    throw new AppError(
      400,
      "Arrival time cannot be in the past.",
      "PAST_BOOKING_TIME"
    );
  }

  try {
    return await prisma.$transaction(async (tx) => {
      // Lock the parent listing row to serialize concurrent booking attempts for the same space
      const lockedListings = await tx.$queryRaw<
        Array<{
          id: string;
          ownerId: string;
          isActive: boolean;
          isApproved: boolean;
          pricePerHourPaise: number;
          currency: string;
          availableFromHour: number;
          availableToHour: number;
          title: string;
        }>
      >`
        SELECT id, "ownerId", "isActive", "isApproved", "pricePerHourPaise", currency, "availableFromHour", "availableToHour", title
        FROM "ParkingListing"
        WHERE id = ${listingId}
        FOR UPDATE
      `;

      const listing = lockedListings[0];
      if (!listing) {
        throw new AppError(404, "Parking listing not found.", "LISTING_NOT_FOUND");
      }
      if (!listing.isActive || !listing.isApproved) {
        throw new AppError(
          400,
          "This parking listing is not currently accepting bookings.",
          "LISTING_INACTIVE"
        );
      }
      if (listing.ownerId === driverId) {
        throw new AppError(
          400,
          "You cannot book your own parking listing.",
          "SELF_BOOKING_NOT_ALLOWED"
        );
      }

      if (
        !isWithinOperatingHours(
          startTime,
          endTime,
          listing.availableFromHour,
          listing.availableToHour
        )
      ) {
        throw new AppError(
          400,
          `Requested time falls outside the listing's operating hours (${String(listing.availableFromHour).padStart(2, "0")}:00 - ${String(listing.availableToHour).padStart(2, "0")}:00 IST).`,
          "OUTSIDE_OPERATING_HOURS"
        );
      }

      const { totalAmountPaise } = calculateBookingPricePaise(
        startTime,
        endTime,
        listing.pricePerHourPaise
      );

      // Release expired holds before checking overlap
      await expireStaleHolds(tx, listingId);

      // Half-open interval check: existing.startTime < endTime && existing.endTime > startTime
      // Adjacent slots where existing.endTime == startTime are allowed.
      const overlapping = await tx.booking.findFirst({
        where: {
          listingId,
          status: {
            in: [BookingStatus.PENDING_PAYMENT, BookingStatus.CONFIRMED],
          },
          startTime: { lt: endTime },
          endTime: { gt: startTime },
        },
        select: { id: true, status: true },
      });

      if (overlapping) {
        throw new AppError(
          409,
          "This parking space is already reserved or held for the selected time window.",
          "BOOKING_CONFLICT"
        );
      }

      const holdExpiresAt = new Date(
        Date.now() + config.cancellationPolicy.holdDurationMinutes * 60 * 1000
      );

      const booking = await tx.booking.create({
        data: {
          reference: generateBookingReference(),
          listingId,
          driverId,
          startTime,
          endTime,
          totalAmountPaise,
          currency: listing.currency,
          status: BookingStatus.PENDING_PAYMENT,
          holdExpiresAt,
          vehicleNumber: vehicleNumber?.trim() || null,
          notes: notes?.trim() || null,
          payment: {
            create: {
              provider: isStripeConfigured()
                ? PaymentProvider.STRIPE
                : PaymentProvider.DEV_TEST,
              status: PaymentStatus.PENDING,
              amountPaise: totalAmountPaise,
              currency: listing.currency,
            },
          },
        },
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
          payment: true,
        },
      });

      return booking;
    });
  } catch (err) {
    if (isExclusionConstraintError(err)) {
      throw new AppError(
        409,
        "This parking space is already reserved or held for the selected time window.",
        "BOOKING_CONFLICT"
      );
    }
    throw err;
  }
}

export async function confirmBookingPayment(params: {
  bookingId: string;
  provider: PaymentProvider;
  stripeSessionId?: string;
  stripePaymentIntentId?: string;
  webhookEventId?: string;
  isDevTestConfirmation?: boolean;
}) {
  const result = await prisma.$transaction(async (tx) => {
    const locked = await tx.$queryRaw<Array<{ id: string }>>`
      SELECT id FROM "Booking" WHERE id = ${params.bookingId} FOR UPDATE
    `;
    if (locked.length === 0) {
      throw new AppError(404, "Booking not found.", "BOOKING_NOT_FOUND");
    }

    const booking = await tx.booking.findUnique({
      where: { id: params.bookingId },
      include: {
        payment: true,
        driver: { select: { id: true, name: true, email: true } },
        listing: {
          select: {
            id: true,
            title: true,
            addressLine: true,
            area: true,
            city: true,
            instructions: true,
          },
        },
      },
    });

    if (!booking || !booking.payment) {
      throw new AppError(404, "Booking or payment record not found.", "NOT_FOUND");
    }

    if (
      params.webhookEventId &&
      booking.payment.lastWebhookEventId === params.webhookEventId
    ) {
      return { booking, alreadyProcessed: true };
    }

    if (booking.status === BookingStatus.CONFIRMED) {
      return { booking, alreadyProcessed: true };
    }

    if (booking.status === BookingStatus.CANCELLED) {
      throw new AppError(
        409,
        "This booking has already been cancelled.",
        "BOOKING_CANCELLED"
      );
    }

    const now = new Date();
    if (
      params.isDevTestConfirmation &&
      (booking.status === BookingStatus.EXPIRED ||
        (booking.holdExpiresAt && booking.holdExpiresAt <= now))
    ) {
      await tx.booking.update({
        where: { id: booking.id },
        data: { status: BookingStatus.EXPIRED },
      });
      await tx.payment.update({
        where: { id: booking.payment.id },
        data: { status: PaymentStatus.CANCELLED },
      });
      throw new AppError(
        409,
        "Your payment hold expired. Please create a new reservation.",
        "HOLD_EXPIRED"
      );
    }

    // Check if another active booking overlapped after an expired hold
    const conflict = await tx.booking.findFirst({
      where: {
        id: { not: booking.id },
        listingId: booking.listingId,
        status: {
          in: [BookingStatus.PENDING_PAYMENT, BookingStatus.CONFIRMED],
        },
        startTime: { lt: booking.endTime },
        endTime: { gt: booking.startTime },
      },
      select: { id: true },
    });

    if (conflict) {
      throw new AppError(
        409,
        "Hold expired and another driver reserved this time slot.",
        "SLOT_NO_LONGER_AVAILABLE"
      );
    }

    const updatedBooking = await tx.booking.update({
      where: { id: booking.id },
      data: {
        status: BookingStatus.CONFIRMED,
        holdExpiresAt: null,
      },
      include: {
        payment: true,
        driver: { select: { id: true, name: true, email: true } },
        listing: {
          select: {
            id: true,
            title: true,
            addressLine: true,
            area: true,
            city: true,
            instructions: true,
          },
        },
      },
    });

    const updatedPayment = await tx.payment.update({
      where: { id: booking.payment.id },
      data: {
        provider: params.provider,
        status: PaymentStatus.SUCCEEDED,
        paidAt: now,
        ...(params.stripeSessionId
          ? { stripeSessionId: params.stripeSessionId }
          : {}),
        ...(params.stripePaymentIntentId
          ? { stripePaymentIntentId: params.stripePaymentIntentId }
          : {}),
        ...(params.webhookEventId
          ? { lastWebhookEventId: params.webhookEventId }
          : {}),
      },
    });

    return {
      booking: { ...updatedBooking, payment: updatedPayment },
      alreadyProcessed: false,
    };
  });

  if (!result.alreadyProcessed) {
    const b = result.booking;
    const paymentStatusLabel =
      b.payment?.provider === PaymentProvider.DEV_TEST
        ? "Confirmed (Local Development Test Mode)"
        : "Paid via Stripe";

    await sendBookingConfirmationEmail({
      toEmail: b.driver.email,
      driverName: b.driver.name,
      reference: b.reference,
      listingTitle: b.listing.title,
      listingAddress: `${b.listing.addressLine}, ${b.listing.area}, ${b.listing.city}`,
      startTime: b.startTime,
      endTime: b.endTime,
      amountPaise: b.totalAmountPaise,
      paymentStatusLabel,
      instructions: b.listing.instructions,
    });
  }

  return result;
}

export function calculateCancellationRefund(
  booking: {
    status: BookingStatus;
    startTime: Date;
    totalAmountPaise: number;
  },
  actorRole: UserRole
): { eligible: boolean; refundAmountPaise: number; reason?: string } {
  if (booking.status === BookingStatus.CANCELLED) {
    return { eligible: false, refundAmountPaise: 0, reason: "Booking is already cancelled." };
  }
  if (booking.status === BookingStatus.EXPIRED) {
    return { eligible: false, refundAmountPaise: 0, reason: "Expired bookings cannot be cancelled." };
  }

  if (booking.status === BookingStatus.PENDING_PAYMENT) {
    return { eligible: true, refundAmountPaise: 0 };
  }

  const now = Date.now();
  const msUntilStart = booking.startTime.getTime() - now;

  if (msUntilStart <= 0 && actorRole !== UserRole.ADMIN) {
    return {
      eligible: false,
      refundAmountPaise: 0,
      reason: "Confirmed bookings cannot be cancelled after the arrival time has passed.",
    };
  }

  if (msUntilStart <= 0) {
    return { eligible: true, refundAmountPaise: 0 };
  }

  const hoursUntilStart = msUntilStart / (1000 * 60 * 60);
  if (hoursUntilStart >= config.cancellationPolicy.freeCancellationHoursBefore) {
    return { eligible: true, refundAmountPaise: booking.totalAmountPaise };
  }

  const partial = Math.round(
    (booking.totalAmountPaise * config.cancellationPolicy.partialRefundPercent) /
      100
  );
  return { eligible: true, refundAmountPaise: partial };
}

export async function cancelBooking(input: {
  bookingId: string;
  actorId: string;
  actorRole: UserRole;
  reason?: string;
}) {
  const { bookingId, actorId, actorRole, reason } = input;

  const existing = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      payment: true,
      driver: { select: { id: true, name: true, email: true } },
      listing: {
        select: {
          id: true,
          ownerId: true,
          title: true,
          addressLine: true,
          area: true,
          city: true,
        },
      },
    },
  });

  if (!existing) {
    throw new AppError(404, "Booking not found.", "BOOKING_NOT_FOUND");
  }

  const canManage =
    existing.driverId === actorId || actorRole === UserRole.ADMIN;
  if (!canManage) {
    throw new AppError(
      403,
      "You do not have permission to cancel this booking.",
      "FORBIDDEN"
    );
  }

  const policy = calculateCancellationRefund(existing, actorRole);
  if (!policy.eligible) {
    throw new AppError(
      400,
      policy.reason || "Booking is not eligible for cancellation.",
      "CANCELLATION_NOT_ALLOWED"
    );
  }

  let stripeRefundId: string | undefined;
  let refundConfirmed = false;
  let nextPaymentStatus: PaymentStatus | undefined;

  if (
    existing.status === BookingStatus.CONFIRMED &&
    existing.payment &&
    existing.payment.status === PaymentStatus.SUCCEEDED
  ) {
    if (policy.refundAmountPaise > 0) {
      if (existing.payment.provider === PaymentProvider.STRIPE) {
        const stripe = getStripeClient();
        if (!stripe || !existing.payment.stripePaymentIntentId) {
          throw new AppError(
            502,
            "Stripe refund could not be initiated because payment intent or Stripe configuration is unavailable.",
            "STRIPE_REFUND_UNAVAILABLE"
          );
        }

        const refund = await stripe.refunds.create({
          payment_intent: existing.payment.stripePaymentIntentId,
          amount: policy.refundAmountPaise,
          metadata: {
            bookingId: existing.id,
            bookingReference: existing.reference,
          },
        });

        stripeRefundId = refund.id;
        refundConfirmed = refund.status === "succeeded";
        if (refundConfirmed) {
          nextPaymentStatus =
            policy.refundAmountPaise >= existing.totalAmountPaise
              ? PaymentStatus.REFUNDED
              : PaymentStatus.PARTIALLY_REFUNDED;
        }
      } else if (existing.payment.provider === PaymentProvider.DEV_TEST) {
        refundConfirmed = true;
        nextPaymentStatus =
          policy.refundAmountPaise >= existing.totalAmountPaise
            ? PaymentStatus.REFUNDED
            : PaymentStatus.PARTIALLY_REFUNDED;
      }
    }
  } else if (existing.status === BookingStatus.PENDING_PAYMENT) {
    nextPaymentStatus = PaymentStatus.CANCELLED;
  }

  const now = new Date();
  const updated = await prisma.$transaction(async (tx) => {
    const updatedBooking = await tx.booking.update({
      where: { id: existing.id },
      data: {
        status: BookingStatus.CANCELLED,
        holdExpiresAt: null,
        cancelledAt: now,
        cancellationReason: reason?.trim() || "Cancelled by user",
        refundAmountPaise: refundConfirmed ? policy.refundAmountPaise : 0,
      },
      include: {
        payment: true,
        listing: {
          select: {
            id: true,
            title: true,
            addressLine: true,
            area: true,
            city: true,
            parkingType: true,
          },
        },
      },
    });

    if (existing.payment) {
      const updatedPayment = await tx.payment.update({
        where: { id: existing.payment.id },
        data: {
          ...(nextPaymentStatus ? { status: nextPaymentStatus } : {}),
          ...(stripeRefundId ? { stripeRefundId } : {}),
          ...(refundConfirmed
            ? {
                refundedAmountPaise: policy.refundAmountPaise,
                refundedAt: now,
              }
            : {}),
        },
      });
      return { ...updatedBooking, payment: updatedPayment };
    }

    return updatedBooking;
  });

  const paymentStatusLabel =
    existing.status === BookingStatus.PENDING_PAYMENT
      ? "Hold released (no charge)"
      : refundConfirmed
        ? existing.payment?.provider === PaymentProvider.DEV_TEST
          ? "Refunded (Local Development Test Mode)"
          : "Refund confirmed via Stripe"
        : stripeRefundId
          ? "Refund submitted to Stripe (awaiting confirmation)"
          : "No refund applicable";

  await sendBookingCancellationEmail({
    toEmail: existing.driver.email,
    driverName: existing.driver.name,
    reference: existing.reference,
    listingTitle: existing.listing.title,
    listingAddress: `${existing.listing.addressLine}, ${existing.listing.area}, ${existing.listing.city}`,
    startTime: existing.startTime,
    endTime: existing.endTime,
    amountPaise: existing.totalAmountPaise,
    paymentStatusLabel,
    refundAmountPaise: refundConfirmed ? policy.refundAmountPaise : 0,
    cancellationReason: updated.cancellationReason,
  });

  return {
    booking: updated,
    refundConfirmed,
    refundPendingConfirmation: Boolean(stripeRefundId && !refundConfirmed),
    eligibleRefundPaise: policy.refundAmountPaise,
  };
}
