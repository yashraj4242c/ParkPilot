import "dotenv/config";

const nodeEnv = process.env.NODE_ENV || "development";
const isProd = nodeEnv === "production";

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (secret && secret.length >= 16) {
    return secret;
  }
  return "parkpilot-secure-production-jwt-token-secret-fallback-key-32chars";
}

export const config = {
  nodeEnv,
  isProd,
  port: Number(process.env.PORT || 3001),
  appUrl: (process.env.APP_URL || "http://localhost:5173").replace(/\/$/, ""),
  jwtSecret: getJwtSecret(),
  sessionCookieName: process.env.SESSION_COOKIE_NAME || "parkpilot_session",
  stripeSecretKey: process.env.STRIPE_SECRET_KEY?.trim() || "",
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET?.trim() || "",
  stripePublishableKey: process.env.STRIPE_PUBLISHABLE_KEY?.trim() || "",
  resendApiKey: process.env.RESEND_API_KEY?.trim() || "",
  resendFromEmail:
    process.env.RESEND_FROM_EMAIL?.trim() ||
    "ParkPilot <bookings@parkpilot.example>",
  enableDevPaymentMode:
    !isProd &&
    process.env.ENABLE_DEV_PAYMENT_MODE !== "false" &&
    !process.env.STRIPE_SECRET_KEY?.trim(),
  cancellationPolicy: {
    holdDurationMinutes: Math.max(
      5,
      Number(process.env.HOLD_DURATION_MINUTES || 15)
    ),
    freeCancellationHoursBefore: Math.max(
      0,
      Number(process.env.FREE_CANCELLATION_HOURS_BEFORE || 2)
    ),
    partialRefundPercent: Math.min(
      100,
      Math.max(0, Number(process.env.PARTIAL_REFUND_PERCENT || 50))
    ),
  },
};

export function isStripeConfigured(): boolean {
  return Boolean(config.stripeSecretKey);
}

export function isResendConfigured(): boolean {
  return Boolean(config.resendApiKey);
}
