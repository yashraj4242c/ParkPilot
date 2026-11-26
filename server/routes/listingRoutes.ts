import { Router } from "express";
import { BookingStatus, ParkingType, Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { AppError, asyncHandler } from "../lib/errors.js";
import {
  calculateBookingPricePaise,
  isWithinOperatingHours,
} from "../lib/pricing.js";
import {
  expireStaleHolds,
  getListingAvailability,
} from "../services/bookingService.js";
import { config } from "../config.js";

const router = Router();

const searchQuerySchema = z.object({
  q: z.string().trim().max(120).optional(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  parkingType: z.nativeEnum(ParkingType).optional(),
  minPricePaise: z.coerce.number().int().min(0).optional(),
  maxPricePaise: z.coerce.number().int().min(0).optional(),
  availableOnly: z
    .enum(["true", "false"])
    .optional()
    .transform((v) => v === "true"),
  sort: z
    .enum(["relevance", "price_asc", "price_desc", "newest"])
    .default("relevance"),
});

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const query = searchQuerySchema.parse(req.query);

    await expireStaleHolds();

    let parsedStart: Date | null = null;
    let parsedEnd: Date | null = null;

    if (query.startTime && query.endTime) {
      parsedStart = new Date(query.startTime);
      parsedEnd = new Date(query.endTime);
      if (
        Number.isNaN(parsedStart.getTime()) ||
        Number.isNaN(parsedEnd.getTime())
      ) {
        throw new AppError(
          400,
          "Invalid search arrival or departure time.",
          "INVALID_DATES"
        );
      }
      if (parsedEnd <= parsedStart) {
        throw new AppError(
          400,
          "Departure time must be after arrival time.",
          "INVALID_DATES"
        );
      }
    }

    const where: Prisma.ParkingListingWhereInput = {
      isActive: true,
      isApproved: true,
      ...(query.parkingType ? { parkingType: query.parkingType } : {}),
      ...(query.minPricePaise !== undefined || query.maxPricePaise !== undefined
        ? {
            pricePerHourPaise: {
              ...(query.minPricePaise !== undefined
                ? { gte: query.minPricePaise }
                : {}),
              ...(query.maxPricePaise !== undefined
                ? { lte: query.maxPricePaise }
                : {}),
            },
          }
        : {}),
      ...(query.q
        ? {
            OR: [
              { title: { contains: query.q, mode: "insensitive" } },
              { area: { contains: query.q, mode: "insensitive" } },
              { city: { contains: query.q, mode: "insensitive" } },
              { addressLine: { contains: query.q, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    const orderBy: Prisma.ParkingListingOrderByWithRelationInput[] =
      query.sort === "price_asc"
        ? [{ pricePerHourPaise: "asc" }, { createdAt: "desc" }]
        : query.sort === "price_desc"
          ? [{ pricePerHourPaise: "desc" }, { createdAt: "desc" }]
          : query.sort === "newest"
            ? [{ createdAt: "desc" }]
            : [{ isSample: "asc" }, { pricePerHourPaise: "asc" }];

    const listings = await prisma.parkingListing.findMany({
      where,
      orderBy,
      select: {
        id: true,
        title: true,
        description: true,
        addressLine: true,
        area: true,
        city: true,
        postalCode: true,
        parkingType: true,
        vehicleCompatibility: true,
        pricePerHourPaise: true,
        currency: true,
        availableFromHour: true,
        availableToHour: true,
        isSample: true,
        createdAt: true,
        owner: {
          select: { name: true },
        },
        ...(parsedStart && parsedEnd
          ? {
              bookings: {
                where: {
                  status: {
                    in: [BookingStatus.PENDING_PAYMENT, BookingStatus.CONFIRMED],
                  },
                  startTime: { lt: parsedEnd },
                  endTime: { gt: parsedStart },
                },
                select: { id: true },
              },
            }
          : {}),
      },
    });

    const enriched = listings
      .map((listing) => {
        const overlappingBookings =
          "bookings" in listing && Array.isArray(listing.bookings)
            ? listing.bookings
            : [];

        let availableForWindow = true;
        let unavailableReason: string | null = null;
        let estimatedTotalPaise: number | null = null;
        let durationMinutes: number | null = null;

        if (parsedStart && parsedEnd) {
          const withinHours = isWithinOperatingHours(
            parsedStart,
            parsedEnd,
            listing.availableFromHour,
            listing.availableToHour
          );
          if (!withinHours) {
            availableForWindow = false;
            unavailableReason = `Operates ${String(listing.availableFromHour).padStart(2, "0")}:00 - ${String(listing.availableToHour).padStart(2, "0")}:00 IST`;
          } else if (overlappingBookings.length > 0) {
            availableForWindow = false;
            unavailableReason = "Reserved for selected time";
          }

          try {
            const calc = calculateBookingPricePaise(
              parsedStart,
              parsedEnd,
              listing.pricePerHourPaise
            );
            estimatedTotalPaise = calc.totalAmountPaise;
            durationMinutes = calc.durationMinutes;
          } catch (err) {
            availableForWindow = false;
            unavailableReason =
              err instanceof AppError ? err.message : "Invalid duration";
          }
        }

        return {
          id: listing.id,
          title: listing.title,
          description: listing.description,
          addressLine: listing.addressLine,
          area: listing.area,
          city: listing.city,
          postalCode: listing.postalCode,
          parkingType: listing.parkingType,
          vehicleCompatibility: listing.vehicleCompatibility,
          pricePerHourPaise: listing.pricePerHourPaise,
          currency: listing.currency,
          availableFromHour: listing.availableFromHour,
          availableToHour: listing.availableToHour,
          isSample: listing.isSample,
          ownerName: listing.owner.name,
          availableForWindow,
          unavailableReason,
          estimatedTotalPaise,
          durationMinutes,
        };
      })
      .filter((item) => (query.availableOnly ? item.availableForWindow : true));

    res.json({
      success: true,
      data: {
        listings: enriched,
        checkedAt: new Date().toISOString(),
      },
    });
  })
);

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    await expireStaleHolds(prisma, req.params.id);

    const listing = await prisma.parkingListing.findUnique({
      where: { id: req.params.id },
      select: {
        id: true,
        ownerId: true,
        title: true,
        description: true,
        addressLine: true,
        area: true,
        city: true,
        postalCode: true,
        parkingType: true,
        vehicleCompatibility: true,
        instructions: true,
        pricePerHourPaise: true,
        currency: true,
        availableFromHour: true,
        availableToHour: true,
        isActive: true,
        isApproved: true,
        isSample: true,
        createdAt: true,
        owner: {
          select: { name: true },
        },
      },
    });

    if (!listing) {
      throw new AppError(404, "Parking listing not found.", "LISTING_NOT_FOUND");
    }

    const upcomingReservedSlots = await prisma.booking.findMany({
      where: {
        listingId: listing.id,
        status: {
          in: [BookingStatus.PENDING_PAYMENT, BookingStatus.CONFIRMED],
        },
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

    res.json({
      success: true,
      data: {
        listing: {
          ...listing,
          ownerName: listing.owner.name,
        },
        upcomingReservedSlots,
        policy: config.cancellationPolicy,
        checkedAt: new Date().toISOString(),
      },
    });
  })
);

router.get(
  "/:id/availability",
  asyncHandler(async (req, res) => {
    const querySchema = z.object({
      startTime: z.string().min(1, "Arrival time is required."),
      endTime: z.string().min(1, "Departure time is required."),
    });

    const { startTime, endTime } = querySchema.parse(req.query);
    const availability = await getListingAvailability(
      req.params.id,
      new Date(startTime),
      new Date(endTime)
    );

    res.json({
      success: true,
      data: availability,
    });
  })
);

export default router;
