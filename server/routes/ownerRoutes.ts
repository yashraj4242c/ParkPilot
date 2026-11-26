import { Router } from "express";
import { BookingStatus, ParkingType, UserRole } from "@prisma/client";
import { z } from "zod";
import { requireAuth, requireRole } from "../lib/auth.js";
import { AppError, asyncHandler } from "../lib/errors.js";
import { prisma } from "../lib/prisma.js";
import { expireStaleHolds } from "../services/bookingService.js";

const router = Router();

router.use(requireAuth, requireRole(UserRole.OWNER, UserRole.ADMIN));

const listingInputSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(4, "Listing name must be at least 4 characters.")
      .max(120, "Listing name is too long."),
    description: z
      .string()
      .trim()
      .min(10, "Description must be at least 10 characters.")
      .max(1500, "Description is too long."),
    addressLine: z
      .string()
      .trim()
      .min(4, "Address is required.")
      .max(200, "Address is too long."),
    area: z
      .string()
      .trim()
      .min(2, "Area or neighbourhood is required.")
      .max(80, "Area is too long."),
    city: z
      .string()
      .trim()
      .min(2, "City is required.")
      .max(80, "City is too long."),
    postalCode: z.string().trim().max(20).optional().or(z.literal("")),
    parkingType: z.nativeEnum(ParkingType),
    vehicleCompatibility: z
      .string()
      .trim()
      .max(200)
      .optional()
      .or(z.literal("")),
    instructions: z.string().trim().max(500).optional().or(z.literal("")),
    pricePerHourPaise: z
      .number()
      .int("Hourly price must be a whole minor-unit amount.")
      .min(1000, "Minimum hourly price is ₹10.00 (1000 paise).")
      .max(500000, "Maximum hourly price is ₹5,000.00."),
    availableFromHour: z.number().int().min(0).max(23).default(0),
    availableToHour: z.number().int().min(1).max(24).default(24),
  })
  .refine((data) => data.availableToHour > data.availableFromHour, {
    message: "Closing hour must be later than opening hour.",
    path: ["availableToHour"],
  });

router.get(
  "/listings",
  asyncHandler(async (req, res) => {
    await expireStaleHolds();

    const listings = await prisma.parkingListing.findMany({
      where: { ownerId: req.user!.id },
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: { bookings: true },
        },
      },
    });

    res.json({
      success: true,
      data: { listings },
    });
  })
);

router.post(
  "/listings",
  asyncHandler(async (req, res) => {
    const data = listingInputSchema.parse(req.body);

    const listing = await prisma.parkingListing.create({
      data: {
        ownerId: req.user!.id,
        title: data.title,
        description: data.description,
        addressLine: data.addressLine,
        area: data.area,
        city: data.city,
        postalCode: data.postalCode || null,
        parkingType: data.parkingType,
        vehicleCompatibility: data.vehicleCompatibility || null,
        instructions: data.instructions || null,
        pricePerHourPaise: data.pricePerHourPaise,
        currency: "INR",
        availableFromHour: data.availableFromHour,
        availableToHour: data.availableToHour,
        isActive: true,
        isApproved: true,
        isSample: false,
      },
    });

    res.status(201).json({
      success: true,
      data: { listing },
    });
  })
);

router.patch(
  "/listings/:id",
  asyncHandler(async (req, res) => {
    const existing = await prisma.parkingListing.findUnique({
      where: { id: req.params.id },
    });

    if (!existing) {
      throw new AppError(404, "Listing not found.", "LISTING_NOT_FOUND");
    }

    if (
      existing.ownerId !== req.user!.id &&
      req.user!.role !== UserRole.ADMIN
    ) {
      throw new AppError(
        403,
        "You can only edit your own listings.",
        "FORBIDDEN"
      );
    }

    const data = listingInputSchema.parse(req.body);

    const listing = await prisma.parkingListing.update({
      where: { id: existing.id },
      data: {
        title: data.title,
        description: data.description,
        addressLine: data.addressLine,
        area: data.area,
        city: data.city,
        postalCode: data.postalCode || null,
        parkingType: data.parkingType,
        vehicleCompatibility: data.vehicleCompatibility || null,
        instructions: data.instructions || null,
        pricePerHourPaise: data.pricePerHourPaise,
        availableFromHour: data.availableFromHour,
        availableToHour: data.availableToHour,
      },
    });

    res.json({
      success: true,
      data: { listing },
    });
  })
);

router.patch(
  "/listings/:id/status",
  asyncHandler(async (req, res) => {
    const schema = z.object({ isActive: z.boolean() });
    const { isActive } = schema.parse(req.body);

    const existing = await prisma.parkingListing.findUnique({
      where: { id: req.params.id },
    });

    if (!existing) {
      throw new AppError(404, "Listing not found.", "LISTING_NOT_FOUND");
    }

    if (
      existing.ownerId !== req.user!.id &&
      req.user!.role !== UserRole.ADMIN
    ) {
      throw new AppError(
        403,
        "You can only pause or activate your own listings.",
        "FORBIDDEN"
      );
    }

    const listing = await prisma.parkingListing.update({
      where: { id: existing.id },
      data: { isActive },
    });

    res.json({
      success: true,
      data: { listing },
    });
  })
);

router.delete(
  "/listings/:id",
  asyncHandler(async (req, res) => {
    await prisma.$transaction(async (tx) => {
      const existing = await tx.parkingListing.findUnique({
        where: { id: req.params.id },
      });

      if (!existing) {
        throw new AppError(404, "Listing not found.", "LISTING_NOT_FOUND");
      }

      if (
        existing.ownerId !== req.user!.id &&
        req.user!.role !== UserRole.ADMIN
      ) {
        throw new AppError(
          403,
          "You can only delete your own listings.",
          "FORBIDDEN"
        );
      }

      await expireStaleHolds(tx, existing.id);

      const activeBookingsCount = await tx.booking.count({
        where: {
          listingId: existing.id,
          status: {
            in: [BookingStatus.PENDING_PAYMENT, BookingStatus.CONFIRMED],
          },
          endTime: { gt: new Date() },
        },
      });

      if (activeBookingsCount > 0) {
        throw new AppError(
          409,
          "Cannot delete listing while it has active or upcoming bookings. Pause the listing instead.",
          "LISTING_HAS_ACTIVE_BOOKINGS"
        );
      }

      await tx.parkingListing.delete({
        where: { id: existing.id },
      });
    });

    res.json({
      success: true,
      data: { deleted: true },
    });
  })
);

router.get(
  "/bookings",
  asyncHandler(async (req, res) => {
    await expireStaleHolds();

    const bookings = await prisma.booking.findMany({
      where: {
        listing: {
          ownerId: req.user!.id,
        },
      },
      orderBy: { startTime: "desc" },
      include: {
        listing: {
          select: {
            id: true,
            title: true,
            area: true,
            city: true,
          },
        },
        driver: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
        payment: {
          select: {
            status: true,
            provider: true,
            amountPaise: true,
            refundedAmountPaise: true,
          },
        },
      },
    });

    res.json({
      success: true,
      data: { bookings },
    });
  })
);

export default router;
