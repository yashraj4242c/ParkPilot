import { Router } from "express";
import { UserRole } from "@prisma/client";
import { z } from "zod";
import { requireAuth, requireRole } from "../lib/auth.js";
import { AppError, asyncHandler } from "../lib/errors.js";
import { prisma } from "../lib/prisma.js";
import { expireStaleHolds } from "../services/bookingService.js";

const router = Router();

router.use(requireAuth, requireRole(UserRole.ADMIN));

router.get(
  "/overview",
  asyncHandler(async (_req, res) => {
    await expireStaleHolds();

    const [users, listings, bookings] = await Promise.all([
      prisma.user.findMany({
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          email: true,
          name: true,
          phone: true,
          role: true,
          isActive: true,
          createdAt: true,
          _count: {
            select: {
              listings: true,
              bookings: true,
            },
          },
        },
      }),
      prisma.parkingListing.findMany({
        orderBy: { createdAt: "desc" },
        include: {
          owner: {
            select: { id: true, name: true, email: true },
          },
          _count: {
            select: { bookings: true },
          },
        },
      }),
      prisma.booking.findMany({
        orderBy: { createdAt: "desc" },
        take: 100,
        include: {
          listing: {
            select: { id: true, title: true, area: true, city: true },
          },
          driver: {
            select: { id: true, name: true, email: true },
          },
          payment: {
            select: {
              provider: true,
              status: true,
              amountPaise: true,
              refundedAmountPaise: true,
            },
          },
        },
      }),
    ]);

    res.json({
      success: true,
      data: {
        users,
        listings,
        bookings,
      },
    });
  })
);

router.patch(
  "/users/:id",
  asyncHandler(async (req, res) => {
    const schema = z.object({
      isActive: z.boolean().optional(),
      role: z.nativeEnum(UserRole).optional(),
    });
    const data = schema.parse(req.body);

    if (req.params.id === req.user!.id && data.isActive === false) {
      throw new AppError(
        400,
        "You cannot deactivate your own admin account.",
        "CANNOT_DEACTIVATE_SELF"
      );
    }

    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: {
        ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
        ...(data.role !== undefined ? { role: data.role } : {}),
      },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });

    res.json({
      success: true,
      data: { user },
    });
  })
);

router.patch(
  "/listings/:id/moderation",
  asyncHandler(async (req, res) => {
    const schema = z.object({
      isApproved: z.boolean().optional(),
      isActive: z.boolean().optional(),
      moderationNote: z.string().trim().max(300).optional().nullable(),
    });
    const data = schema.parse(req.body);

    const listing = await prisma.parkingListing.update({
      where: { id: req.params.id },
      data: {
        ...(data.isApproved !== undefined
          ? { isApproved: data.isApproved }
          : {}),
        ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
        ...(data.moderationNote !== undefined
          ? { moderationNote: data.moderationNote }
          : {}),
      },
      include: {
        owner: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    res.json({
      success: true,
      data: { listing },
    });
  })
);

export default router;
