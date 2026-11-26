import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { UserRole } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { AppError, asyncHandler } from "../lib/errors.js";
import {
  clearSessionCookie,
  requireAuth,
  setSessionCookie,
  signAuthToken,
} from "../lib/auth.js";

const router = Router();

const signupSchema = z.object({
  email: z.string().trim().email("Please provide a valid email address."),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters.")
    .max(128, "Password is too long."),
  name: z
    .string()
    .trim()
    .min(2, "Name must be at least 2 characters.")
    .max(80, "Name is too long."),
  phone: z
    .string()
    .trim()
    .max(24, "Phone number is too long.")
    .optional()
    .or(z.literal("")),
  role: z.enum(["DRIVER", "OWNER"]).default("DRIVER"),
});

const loginSchema = z.object({
  email: z.string().trim().email("Please provide a valid email address."),
  password: z.string().min(1, "Password is required."),
});

const updateProfileSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Name must be at least 2 characters.")
    .max(80, "Name is too long."),
  phone: z
    .string()
    .trim()
    .max(24, "Phone number is too long.")
    .optional()
    .or(z.literal("")),
});

router.post(
  "/signup",
  asyncHandler(async (req, res) => {
    const data = signupSchema.parse(req.body);
    const email = data.email.toLowerCase();

    const existing = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (existing) {
      throw new AppError(
        409,
        "An account with this email already exists.",
        "EMAIL_EXISTS"
      );
    }

    const passwordHash = await bcrypt.hash(data.password, 12);
    const role =
      data.role === "OWNER" ? UserRole.OWNER : UserRole.DRIVER;

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        name: data.name,
        phone: data.phone || null,
        role,
        isActive: true,
      },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        createdAt: true,
      },
    });

    const token = signAuthToken({ sub: user.id, role: user.role });
    setSessionCookie(res, token);

    res.status(201).json({
      success: true,
      data: { user },
    });
  })
);

router.post(
  "/login",
  asyncHandler(async (req, res) => {
    const data = loginSchema.parse(req.body);
    const email = data.email.toLowerCase();

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new AppError(
        401,
        "Invalid email or password.",
        "INVALID_CREDENTIALS"
      );
    }

    if (!user.isActive) {
      throw new AppError(
        403,
        "This account has been deactivated. Contact support.",
        "ACCOUNT_INACTIVE"
      );
    }

    const isMatch = await bcrypt.compare(data.password, user.passwordHash);
    if (!isMatch) {
      throw new AppError(
        401,
        "Invalid email or password.",
        "INVALID_CREDENTIALS"
      );
    }

    const token = signAuthToken({ sub: user.id, role: user.role });
    setSessionCookie(res, token);

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          phone: user.phone,
          role: user.role,
          createdAt: user.createdAt,
        },
      },
    });
  })
);

router.post("/logout", (_req, res) => {
  clearSessionCookie(res);
  res.json({ success: true, data: { loggedOut: true } });
});

router.get(
  "/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
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

    res.json({ success: true, data: { user } });
  })
);

router.patch(
  "/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    const data = updateProfileSchema.parse(req.body);

    const user = await prisma.user.update({
      where: { id: req.user!.id },
      data: {
        name: data.name,
        phone: data.phone || null,
      },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        createdAt: true,
      },
    });

    res.json({ success: true, data: { user } });
  })
);

export default router;
