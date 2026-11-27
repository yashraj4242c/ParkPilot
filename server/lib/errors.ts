import type { NextFunction, Request, Response } from "express";
import { Prisma } from "@prisma/client";
import { ZodError } from "zod";
import { config } from "../config.js";

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: unknown;

  constructor(
    statusCode: number,
    message: string,
    code = "REQUEST_ERROR",
    details?: unknown
  ) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

export function isExclusionConstraintError(err: unknown): boolean {
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2004" || err.code === "P2010") {
      const msg = String(err.meta?.message ?? err.message);
      if (msg.includes("booking_no_overlap_active") || msg.includes("23P01")) {
        return true;
      }
    }
  }
  const message = err instanceof Error ? err.message : String(err);
  return (
    message.includes("booking_no_overlap_active") ||
    message.includes("23P01") ||
    message.includes("conflicting key value violates exclusion constraint")
  );
}

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
        ...(err.details !== undefined ? { details: err.details } : {}),
      },
    });
    return;
  }

  if (err instanceof ZodError) {
    res.status(400).json({
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: err.issues[0]?.message || "Invalid request input.",
        details: err.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message,
        })),
      },
    });
    return;
  }

  if (isExclusionConstraintError(err)) {
    res.status(409).json({
      success: false,
      error: {
        code: "BOOKING_CONFLICT",
        message:
          "This parking space is already reserved or held for the selected time window.",
      },
    });
    return;
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2002") {
      res.status(409).json({
        success: false,
        error: {
          code: "UNIQUE_CONFLICT",
          message: "A record with this identifier already exists.",
        },
      });
      return;
    }
    if (err.code === "P2025") {
      res.status(404).json({
        success: false,
        error: {
          code: "NOT_FOUND",
          message: "Requested record was not found.",
        },
      });
      return;
    }
    if (err.code === "P2021") {
      res.status(503).json({
        success: false,
        error: {
          code: "DATABASE_NOT_MIGRATED",
          message:
            "Database tables do not exist yet. Please run 'npx prisma migrate deploy' on your cloud PostgreSQL database.",
        },
      });
      return;
    }
    if (err.code === "P1001" || err.code === "P1000") {
      res.status(503).json({
        success: false,
        error: {
          code: "DATABASE_UNREACHABLE",
          message:
            "Cannot connect to the database. Please verify DATABASE_URL in your Vercel Environment Variables.",
        },
      });
      return;
    }
  }

  if (err instanceof Prisma.PrismaClientInitializationError) {
    res.status(503).json({
      success: false,
      error: {
        code: "DATABASE_INIT_ERROR",
        message:
          "Database initialization failed. Please ensure DATABASE_URL is set in Vercel settings and points to a live cloud PostgreSQL database.",
      },
    });
    return;
  }

  if (!config.isProd) {
    console.error("Unhandled API error:", err);
  } else {
    console.error(
      "Unhandled API error:",
      err instanceof Error ? err.message : "Unknown error"
    );
  }

  res.status(500).json({
    success: false,
    error: {
      code: "INTERNAL_ERROR",
      message: "An unexpected server error occurred.",
    },
  });
}
