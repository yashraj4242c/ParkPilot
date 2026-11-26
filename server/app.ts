import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { config } from "./config.js";
import { errorHandler } from "./lib/errors.js";
import { prisma } from "./lib/prisma.js";
import authRoutes from "./routes/authRoutes.js";
import listingRoutes from "./routes/listingRoutes.js";
import bookingRoutes from "./routes/bookingRoutes.js";
import paymentRoutes, {
  stripeWebhookHandler,
} from "./routes/paymentRoutes.js";
import ownerRoutes from "./routes/ownerRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";

export function createApp() {
  const app = express();

  app.set("trust proxy", 1);

  app.use(
    helmet({
      contentSecurityPolicy: false,
    })
  );

  app.use(
    cors({
      origin: config.isProd ? [config.appUrl] : true,
      credentials: true,
    })
  );

  // Stripe webhook must receive raw JSON payload before express.json() parses it
  app.post(
    "/api/payments/webhook",
    express.raw({ type: "application/json" }),
    stripeWebhookHandler
  );

  app.use(
    express.json({
      limit: "1mb",
      verify: (req, _res, buf) => {
        (req as express.Request).rawBody = buf;
      },
    })
  );

  app.use(cookieParser());

  const isTest = config.nodeEnv === "test";

  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: isTest ? 1000 : 40,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      success: false,
      error: {
        code: "RATE_LIMITED",
        message: "Too many authentication attempts. Please try again shortly.",
      },
    },
  });

  const sensitiveActionLimiter = rateLimit({
    windowMs: 5 * 60 * 1000,
    max: isTest ? 1000 : 60,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      success: false,
      error: {
        code: "RATE_LIMITED",
        message: "Too many requests. Please wait a moment and try again.",
      },
    },
  });

  app.get("/api/health", async (_req, res) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      res.json({
        success: true,
        data: {
          status: "ok",
          database: "connected",
          timestamp: new Date().toISOString(),
        },
      });
    } catch {
      res.status(503).json({
        success: false,
        error: {
          code: "DB_UNAVAILABLE",
          message: "Database connection failed.",
        },
      });
    }
  });

  app.use("/api/auth", authLimiter, authRoutes);
  app.use("/api/listings", listingRoutes);
  app.use("/api/bookings", sensitiveActionLimiter, bookingRoutes);
  app.use("/api/payments", sensitiveActionLimiter, paymentRoutes);
  app.use("/api/owner", ownerRoutes);
  app.use("/api/admin", adminRoutes);

  app.use("/api", (_req, res) => {
    res.status(404).json({
      success: false,
      error: {
        code: "NOT_FOUND",
        message: "API endpoint not found.",
      },
    });
  });

  app.use(errorHandler);

  return app;
}

const app = createApp();
export default app;
