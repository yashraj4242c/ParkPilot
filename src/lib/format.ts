import type { BookingStatus, ParkingType, PaymentStatus } from "../types";

export function formatInrFromPaise(paise: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: paise % 100 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(paise / 100);
}

export function formatLocalDateTime(iso: string | Date): string {
  const date = typeof iso === "string" ? new Date(iso) : iso;
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function formatDuration(minutes: number): string {
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hrs === 0) return `${mins} min`;
  if (mins === 0) return `${hrs} hr${hrs > 1 ? "s" : ""}`;
  return `${hrs} hr${hrs > 1 ? "s" : ""} ${mins} min`;
}

export function parkingTypeLabel(type: ParkingType): string {
  switch (type) {
    case "COVERED":
      return "Covered";
    case "OPEN_LOT":
      return "Open Lot";
    case "GARAGE":
      return "Private Garage";
    case "DRIVEWAY":
      return "Driveway";
    case "VALET":
      return "Valet";
  }
}

export function bookingStatusLabel(status: BookingStatus): string {
  switch (status) {
    case "PENDING_PAYMENT":
      return "Pending payment";
    case "CONFIRMED":
      return "Confirmed";
    case "CANCELLED":
      return "Cancelled";
    case "EXPIRED":
      return "Expired";
  }
}

export function paymentStatusLabel(status: PaymentStatus): string {
  switch (status) {
    case "PENDING":
      return "Awaiting payment";
    case "SUCCEEDED":
      return "Paid";
    case "FAILED":
      return "Failed";
    case "CANCELLED":
      return "Cancelled";
    case "REFUNDED":
      return "Refunded";
    case "PARTIALLY_REFUNDED":
      return "Partially refunded";
  }
}

export function formatOperatingHours(fromHour: number, toHour: number): string {
  if (fromHour === 0 && toHour === 24) {
    return "Open 24 hours";
  }
  const pad = (h: number) => `${String(h).padStart(2, "0")}:00`;
  return `${pad(fromHour)} – ${pad(toHour)} IST`;
}

export function toLocalDateTimeInputValue(date: Date): string {
  const offsetMs = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

export function getDefaultSearchWindow(): {
  startInput: string;
  endInput: string;
} {
  const now = new Date();
  // Round up to next hour + 1 hour so default search window is always cleanly in the future
  const start = new Date(now);
  start.setMinutes(0, 0, 0);
  start.setHours(start.getHours() + 2);

  const end = new Date(start.getTime() + 2 * 60 * 60 * 1000);
  return {
    startInput: toLocalDateTimeInputValue(start),
    endInput: toLocalDateTimeInputValue(end),
  };
}

export function calculateEstimatedTotalPaise(
  startInput: string,
  endInput: string,
  pricePerHourPaise: number
): { durationMinutes: number; totalAmountPaise: number } | null {
  if (!startInput || !endInput) return null;
  const start = new Date(startInput);
  const end = new Date(endInput);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return null;
  }
  const durationMinutes = Math.round((end.getTime() - start.getTime()) / 60000);
  if (durationMinutes < 30 || durationMinutes > 30 * 24 * 60) {
    return null;
  }
  const totalAmountPaise = Math.max(
    100,
    Math.round((durationMinutes / 60) * pricePerHourPaise)
  );
  return { durationMinutes, totalAmountPaise };
}
