import type { BookingStatus, PaymentStatus } from "../types";
import { bookingStatusLabel, paymentStatusLabel } from "../lib/format";

const bookingStyles: Record<BookingStatus, string> = {
  CONFIRMED: "border-emerald-500/40 bg-emerald-950/40 text-emerald-400",
  PENDING_PAYMENT: "border-amber-500/40 bg-amber-950/40 text-amber-300 animate-pulse",
  CANCELLED: "border-slate-600 bg-slate-900/60 text-slate-400",
  EXPIRED: "border-slate-700 bg-slate-950 text-slate-500",
};

export function BookingStatusBadge({ status }: { status: BookingStatus }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-mono text-[10px] font-semibold tracking-wider uppercase ${bookingStyles[status]}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${status === 'CONFIRMED' ? 'bg-emerald-400' : status === 'PENDING_PAYMENT' ? 'bg-amber-400' : 'bg-slate-500'}`} />
      {bookingStatusLabel(status)}
    </span>
  );
}

const paymentStyles: Record<PaymentStatus, string> = {
  SUCCEEDED: "border-emerald-500/40 bg-emerald-950/40 text-emerald-400",
  PENDING: "border-amber-500/40 bg-amber-950/40 text-amber-300",
  FAILED: "border-red-500/40 bg-red-950/40 text-red-400",
  CANCELLED: "border-slate-700 bg-slate-900/60 text-slate-500",
  REFUNDED: "border-sky-500/40 bg-sky-950/40 text-sky-400",
  PARTIALLY_REFUNDED: "border-sky-500/40 bg-sky-950/40 text-sky-400",
};

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-mono text-[10px] font-semibold tracking-wider uppercase ${paymentStyles[status]}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${status === 'SUCCEEDED' ? 'bg-emerald-400' : status === 'PENDING' ? 'bg-amber-400' : status === 'REFUNDED' ? 'bg-sky-400' : 'bg-red-400'}`} />
      {paymentStatusLabel(status)}
    </span>
  );
}
