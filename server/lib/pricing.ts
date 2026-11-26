import { AppError } from "./errors.js";

export const MIN_BOOKING_MINUTES = 30;
export const MAX_BOOKING_DAYS = 30;

export function calculateBookingPricePaise(
  startTime: Date,
  endTime: Date,
  pricePerHourPaise: number
): { durationMinutes: number; totalAmountPaise: number } {
  const diffMs = endTime.getTime() - startTime.getTime();
  const durationMinutes = Math.round(diffMs / 60000);

  if (durationMinutes < MIN_BOOKING_MINUTES) {
    throw new AppError(
      400,
      `Minimum booking duration is ${MIN_BOOKING_MINUTES} minutes.`,
      "INVALID_DURATION"
    );
  }

  if (durationMinutes > MAX_BOOKING_DAYS * 24 * 60) {
    throw new AppError(
      400,
      `Maximum booking duration is ${MAX_BOOKING_DAYS} days.`,
      "INVALID_DURATION"
    );
  }

  const totalAmountPaise = Math.max(
    100,
    Math.round((durationMinutes / 60) * pricePerHourPaise)
  );

  return { durationMinutes, totalAmountPaise };
}

function getKolkataHourMinute(date: Date): {
  dayKey: string;
  hourDecimal: number;
} {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);

  const map = new Map(parts.map((p) => [p.type, p.value]));
  const dayKey = `${map.get("year")}-${map.get("month")}-${map.get("day")}`;
  const rawHour = Number(map.get("hour") || 0);
  const hour = rawHour === 24 ? 0 : rawHour;
  const minute = Number(map.get("minute") || 0);

  return { dayKey, hourDecimal: hour + minute / 60 };
}

export function isWithinOperatingHours(
  startTime: Date,
  endTime: Date,
  availableFromHour: number,
  availableToHour: number
): boolean {
  if (availableFromHour === 0 && availableToHour === 24) {
    return true;
  }

  const startLocal = getKolkataHourMinute(startTime);
  const endLocal = getKolkataHourMinute(endTime);

  // If the listing has restricted daily hours, bookings must fall within the same day's window
  // unless end is midnight (00:00 of next day when availableToHour === 24).
  const isExactMidnightEnd =
    endLocal.hourDecimal === 0 &&
    endTime.getTime() - startTime.getTime() <= 24 * 60 * 60 * 1000;

  if (startLocal.dayKey !== endLocal.dayKey) {
    if (
      isExactMidnightEnd &&
      availableToHour === 24 &&
      startLocal.hourDecimal >= availableFromHour
    ) {
      return true;
    }
    return false;
  }

  return (
    startLocal.hourDecimal >= availableFromHour &&
    endLocal.hourDecimal <= availableToHour
  );
}
