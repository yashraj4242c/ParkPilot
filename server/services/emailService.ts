import { Resend } from "resend";
import { config, isResendConfigured } from "../config.js";

export interface EmailSendResult {
  sent: boolean;
  provider: "resend" | "dev_log";
  id?: string;
}

interface BookingEmailData {
  toEmail: string;
  driverName: string;
  reference: string;
  listingTitle: string;
  listingAddress: string;
  startTime: Date;
  endTime: Date;
  amountPaise: number;
  paymentStatusLabel: string;
  instructions?: string | null;
  refundAmountPaise?: number | null;
  cancellationReason?: string | null;
}

function formatInr(paise: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
  }).format(paise / 100);
}

function formatIstDateTime(date: Date): string {
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildEmailLayout(title: string, bodyHtml: string): string {
  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #FAFAF8; padding: 32px 16px; color: #14171A;">
      <div style="max-width: 560px; margin: 0 auto; background: #FFFFFF; border: 1px solid #E4E6EA; border-radius: 12px; overflow: hidden;">
        <div style="padding: 20px 28px; border-bottom: 1px solid #E4E6EA;">
          <span style="font-size: 16px; font-weight: 600; letter-spacing: -0.01em; color: #14171A;">ParkPilot</span>
        </div>
        <div style="padding: 28px;">
          <h1 style="margin: 0 0 16px; font-size: 20px; font-weight: 600; color: #14171A;">${escapeHtml(title)}</h1>
          ${bodyHtml}
        </div>
        <div style="padding: 16px 28px; background: #FAFAF8; border-top: 1px solid #E4E6EA; font-size: 12px; color: #525866;">
          Times shown in IST (Asia/Kolkata). Keep your booking reference handy when arriving.
        </div>
      </div>
    </div>
  `;
}

async function sendEmail(
  to: string,
  subject: string,
  html: string,
  text: string
): Promise<EmailSendResult> {
  if (!isResendConfigured()) {
    console.info(
      `[Email:NotConfigured] Resend API key missing. Email not sent to ${to}. Subject: "${subject}"`
    );
    return { sent: false, provider: "dev_log" };
  }

  try {
    const resend = new Resend(config.resendApiKey);
    const response = await resend.emails.send({
      from: config.resendFromEmail,
      to,
      subject,
      html,
      text,
    });

    if (response.error) {
      console.error("[Email:ResendError]", response.error);
      return { sent: false, provider: "resend" };
    }

    return {
      sent: true,
      provider: "resend",
      id: response.data?.id,
    };
  } catch (err) {
    console.error("[Email:Exception]", err);
    return { sent: false, provider: "resend" };
  }
}

export async function sendBookingConfirmationEmail(
  data: BookingEmailData
): Promise<EmailSendResult> {
  const subject = `Booking confirmed: ${data.reference} - ${data.listingTitle}`;
  const arrival = formatIstDateTime(data.startTime);
  const departure = formatIstDateTime(data.endTime);
  const amount = formatInr(data.amountPaise);

  const html = buildEmailLayout(
    "Your parking booking is confirmed",
    `
      <p style="margin: 0 0 18px; color: #525866; line-height: 1.5;">
        Hi ${escapeHtml(data.driverName)}, your reservation at <strong>${escapeHtml(data.listingTitle)}</strong> is confirmed.
      </p>
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 18px; font-size: 14px;">
        <tr><td style="padding: 8px 0; color: #525866; border-bottom: 1px solid #E4E6EA;">Booking reference</td><td style="padding: 8px 0; font-weight: 600; text-align: right; border-bottom: 1px solid #E4E6EA;">${escapeHtml(data.reference)}</td></tr>
        <tr><td style="padding: 8px 0; color: #525866; border-bottom: 1px solid #E4E6EA;">Location</td><td style="padding: 8px 0; text-align: right; border-bottom: 1px solid #E4E6EA;">${escapeHtml(data.listingAddress)}</td></tr>
        <tr><td style="padding: 8px 0; color: #525866; border-bottom: 1px solid #E4E6EA;">Arrival</td><td style="padding: 8px 0; text-align: right; border-bottom: 1px solid #E4E6EA;">${escapeHtml(arrival)}</td></tr>
        <tr><td style="padding: 8px 0; color: #525866; border-bottom: 1px solid #E4E6EA;">Departure</td><td style="padding: 8px 0; text-align: right; border-bottom: 1px solid #E4E6EA;">${escapeHtml(departure)}</td></tr>
        <tr><td style="padding: 8px 0; color: #525866; border-bottom: 1px solid #E4E6EA;">Total</td><td style="padding: 8px 0; font-weight: 600; text-align: right; border-bottom: 1px solid #E4E6EA;">${escapeHtml(amount)}</td></tr>
        <tr><td style="padding: 8px 0; color: #525866;">Payment status</td><td style="padding: 8px 0; text-align: right;">${escapeHtml(data.paymentStatusLabel)}</td></tr>
      </table>
      ${
        data.instructions
          ? `<div style="padding: 12px 14px; background: #EEF4F6; border-radius: 8px; font-size: 13px; color: #14171A;"><strong>Arrival instructions:</strong> ${escapeHtml(data.instructions)}</div>`
          : ""
      }
    `
  );

  const text = `Booking confirmed (${data.reference})\nSpace: ${data.listingTitle}\nAddress: ${data.listingAddress}\nArrival: ${arrival}\nDeparture: ${departure}\nTotal: ${amount}\nPayment status: ${data.paymentStatusLabel}`;

  return sendEmail(data.toEmail, subject, html, text);
}

export async function sendBookingCancellationEmail(
  data: BookingEmailData
): Promise<EmailSendResult> {
  const subject = `Booking cancelled: ${data.reference} - ${data.listingTitle}`;
  const arrival = formatIstDateTime(data.startTime);
  const departure = formatIstDateTime(data.endTime);
  const refundText =
    data.refundAmountPaise && data.refundAmountPaise > 0
      ? formatInr(data.refundAmountPaise)
      : "No refund applicable";

  const html = buildEmailLayout(
    "Your parking booking has been cancelled",
    `
      <p style="margin: 0 0 18px; color: #525866; line-height: 1.5;">
        Hi ${escapeHtml(data.driverName)}, your reservation <strong>${escapeHtml(data.reference)}</strong> has been cancelled and the parking slot has been released.
      </p>
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 18px; font-size: 14px;">
        <tr><td style="padding: 8px 0; color: #525866; border-bottom: 1px solid #E4E6EA;">Parking space</td><td style="padding: 8px 0; text-align: right; border-bottom: 1px solid #E4E6EA;">${escapeHtml(data.listingTitle)}</td></tr>
        <tr><td style="padding: 8px 0; color: #525866; border-bottom: 1px solid #E4E6EA;">Scheduled window</td><td style="padding: 8px 0; text-align: right; border-bottom: 1px solid #E4E6EA;">${escapeHtml(arrival)} - ${escapeHtml(departure)}</td></tr>
        <tr><td style="padding: 8px 0; color: #525866; border-bottom: 1px solid #E4E6EA;">Original amount</td><td style="padding: 8px 0; text-align: right; border-bottom: 1px solid #E4E6EA;">${escapeHtml(formatInr(data.amountPaise))}</td></tr>
        <tr><td style="padding: 8px 0; color: #525866; border-bottom: 1px solid #E4E6EA;">Refund status</td><td style="padding: 8px 0; font-weight: 600; text-align: right; border-bottom: 1px solid #E4E6EA;">${escapeHtml(data.paymentStatusLabel)} (${escapeHtml(refundText)})</td></tr>
        ${
          data.cancellationReason
            ? `<tr><td style="padding: 8px 0; color: #525866;">Reason</td><td style="padding: 8px 0; text-align: right;">${escapeHtml(data.cancellationReason)}</td></tr>`
            : ""
        }
      </table>
    `
  );

  const text = `Booking cancelled (${data.reference})\nSpace: ${data.listingTitle}\nWindow: ${arrival} - ${departure}\nRefund: ${refundText}\nStatus: ${data.paymentStatusLabel}`;

  return sendEmail(data.toEmail, subject, html, text);
}
