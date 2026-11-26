import { useCallback, useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Clock,
  CreditCard,
  Cpu,
  Info,
  MapPin,
} from "lucide-react";
import { apiRequest } from "../lib/api";
import {
  formatInrFromPaise,
  formatLocalDateTime,
  parkingTypeLabel,
} from "../lib/format";
import {
  BookingStatusBadge,
  PaymentStatusBadge,
} from "../components/StatusBadge";
import { ConfirmDialog } from "../components/ConfirmDialog";
import type { BookingRecord, CancellationPolicy } from "../types";

export function BookingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams, setSearchParams] = useSearchParams();

  const [booking, setBooking] = useState<BookingRecord | null>(null);
  const [policy, setPolicy] = useState<CancellationPolicy | null>(null);
  const [paymentModeInfo, setPaymentModeInfo] = useState<{
    stripeConfigured: boolean;
    devPaymentMode: boolean;
  } | null>(null);

  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [confirmCancelOpen, setConfirmCancelOpen] = useState(false);
  const cancelReason = "Cancelled by user";
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());

  const loadBooking = useCallback(async () => {
    if (!id) return;
    try {
      const [bookingData, payConfig] = await Promise.all([
        apiRequest<{
          booking: BookingRecord;
          policy: CancellationPolicy;
        }>(`/api/bookings/${id}`),
        apiRequest<{
          stripeConfigured: boolean;
          devPaymentMode: boolean;
        }>("/api/payments/config"),
      ]);
      setBooking(bookingData.booking);
      setPolicy(bookingData.policy);
      setPaymentModeInfo(payConfig);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load booking.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void loadBooking();
  }, [loadBooking]);

  useEffect(() => {
    const checkoutState = searchParams.get("checkout");
    const sessionId = searchParams.get("session_id");
    if (!id) return;

    if (checkoutState === "cancelled") {
      setMessage("Stripe checkout cancelled. Holding slot remains active until timeout.");
      return;
    }

    if (checkoutState === "success" && sessionId) {
      void (async () => {
        try {
          const res = await apiRequest<{
            status: string;
            booking: BookingRecord;
          }>("/api/payments/verify-session", {
            method: "POST",
            body: JSON.stringify({ bookingId: id, sessionId }),
          });
          setBooking(res.booking);
          setMessage("Payment verified. Booking confirmed in slot ledger.");
          setSearchParams({}, { replace: true });
        } catch (err) {
          setError(
            err instanceof Error
              ? err.message
              : "Could not verify payment session."
          );
        }
      })();
    }
  }, [id, searchParams, setSearchParams]);

  useEffect(() => {
    if (booking?.status !== "PENDING_PAYMENT") return;
    const tick = window.setInterval(() => setNowMs(Date.now()), 1000);
    const poll = window.setInterval(() => void loadBooking(), 6000);
    return () => {
      window.clearInterval(tick);
      window.clearInterval(poll);
    };
  }, [booking?.status, loadBooking]);

  const handleCheckout = async () => {
    if (!booking) return;
    setPaying(true);
    setError(null);
    setMessage(null);
    try {
      const res = await apiRequest<{
        mode: "stripe" | "dev_test" | "already_confirmed";
        checkoutUrl?: string;
      }>("/api/payments/checkout", {
        method: "POST",
        body: JSON.stringify({ bookingId: booking.id }),
      });

      if (res.mode === "stripe" && res.checkoutUrl) {
        window.location.href = res.checkoutUrl;
        return;
      }

      if (res.mode === "already_confirmed") {
        await loadBooking();
        return;
      }

      if (res.mode === "dev_test") {
        const confirmed = await apiRequest<{ booking: BookingRecord }>(
          "/api/payments/dev-confirm",
          {
            method: "POST",
            body: JSON.stringify({ bookingId: booking.id }),
          }
        );
        setBooking(confirmed.booking);
        setMessage("Booking confirmed via Local Development Test Gateway.");
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Payment processing failed."
      );
      await loadBooking();
    } finally {
      setPaying(false);
    }
  };

  const handleCancelBooking = async () => {
    if (!booking) return;
    setCancelling(true);
    setError(null);
    setMessage(null);
    try {
      const res = await apiRequest<{
        booking: BookingRecord;
        refundConfirmed: boolean;
        refundPendingConfirmation: boolean;
        eligibleRefundPaise: number;
      }>(`/api/bookings/${booking.id}/cancel`, {
        method: "POST",
        body: JSON.stringify({ reason: cancelReason.trim() || undefined }),
      });

      setBooking(res.booking);
      setConfirmCancelOpen(false);
      if (res.refundConfirmed && res.eligibleRefundPaise > 0) {
        setMessage(
          `Reservation cancelled. Refund of ${formatInrFromPaise(res.eligibleRefundPaise)} confirmed.`
        );
      } else if (res.refundPendingConfirmation) {
        setMessage("Reservation cancelled. Stripe refund submitted.");
      } else {
        setMessage("Reservation cancelled and slot returned to public pool.");
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to cancel booking."
      );
    } finally {
      setCancelling(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
        <div className="card p-8 font-mono text-xs text-ink-muted">
          SYNCHRONIZING RESERVATION RECORD...
        </div>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
        <div className="card p-8 text-center font-mono">
          <h1 className="text-base font-bold text-red-400">RECORD NOT FOUND</h1>
          <p className="mt-2 text-xs text-ink-muted">
            {error || "Booking could not be resolved in ledger."}
          </p>
          <Link to="/bookings" className="btn-secondary mt-5">
            MY BOOKINGS
          </Link>
        </div>
      </div>
    );
  }

  const holdRemainingSeconds = booking.holdExpiresAt
    ? Math.max(
        0,
        Math.floor((new Date(booking.holdExpiresAt).getTime() - nowMs) / 1000)
      )
    : 0;
  const holdMins = Math.floor(holdRemainingSeconds / 60);
  const holdSecs = holdRemainingSeconds % 60;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <Link
        to="/bookings"
        className="inline-flex items-center gap-2 font-mono text-xs text-ink-muted hover:text-accent transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        <span>RETURN TO BOOKINGS LEDGER</span>
      </Link>

      <div className="card mt-5 border-line-strong bg-canvas-panel/95 p-6 shadow-terminal sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-line/60 pb-5">
          <div>
            <div className="flex items-center gap-2 font-mono text-xs text-accent">
              <Cpu className="h-3.5 w-3.5" />
              <span>RESERVATION DISPATCH TICKET</span>
            </div>
            <h1 className="mt-1 font-mono text-2xl font-bold tracking-tight text-ink sm:text-3xl">
              {booking.reference}
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <BookingStatusBadge status={booking.status} />
            {booking.payment && (
              <PaymentStatusBadge status={booking.payment.status} />
            )}
          </div>
        </div>

        {message && (
          <div className="mt-5 flex items-start gap-2.5 rounded-lg border border-emerald-500/40 bg-emerald-950/40 p-3.5 font-mono text-xs text-emerald-300">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
            <span>{message}</span>
          </div>
        )}

        {error && (
          <div className="mt-5 flex items-start gap-2.5 rounded-lg border border-red-500/40 bg-red-950/40 p-3.5 font-mono text-xs text-red-300">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
            <span>{error}</span>
          </div>
        )}

        {/* Active Hold Terminal Box */}
        {booking.status === "PENDING_PAYMENT" && (
          <div className="mt-6 rounded-xl border border-amber-500/40 bg-amber-950/30 p-5 font-mono">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-500/20 pb-3">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-300 uppercase">
                <Clock className="h-4 w-4 animate-spin text-amber-400" />
                <span>EXCLUSION HOLD ACTIVE</span>
              </div>
              <span className="rounded bg-amber-950 px-2.5 py-1 text-sm font-mono font-bold text-amber-200 border border-amber-500/40">
                TTL: {String(holdMins).padStart(2, "0")}:{String(holdSecs).padStart(2, "0")}
              </span>
            </div>
            <p className="mt-3 text-xs text-amber-200/90 leading-relaxed">
              This bay is reserved exclusively for your session. Complete checkout before countdown expires to confirm slot allocation.
            </p>

            {paymentModeInfo &&
              !paymentModeInfo.stripeConfigured &&
              paymentModeInfo.devPaymentMode && (
                <div className="mt-3 rounded border border-amber-500/30 bg-canvas/70 p-3 text-[11px] text-ink-muted">
                  [DEV GATEWAY ACTIVE] External Stripe keys are not detected in environment. Development confirmation will execute without live charge.
                </div>
              )}

            <div className="mt-5 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleCheckout}
                disabled={paying || holdRemainingSeconds === 0}
                className="btn-primary py-3 px-5"
              >
                <CreditCard className="h-4 w-4" />
                <span>
                  {paying
                    ? "COMMITTING TRANSACTION..."
                    : paymentModeInfo?.stripeConfigured
                      ? `CONFIRM VIA STRIPE (${formatInrFromPaise(booking.totalAmountPaise)})`
                      : `EXECUTE TEST SETTLEMENT (${formatInrFromPaise(booking.totalAmountPaise)})`}
                </span>
              </button>
            </div>
          </div>
        )}

        {/* Space and Time Matrix */}
        <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 font-mono text-xs">
          <div className="rounded-xl border border-line bg-canvas/60 p-4">
            <div className="text-[11px] uppercase tracking-wider text-accent font-semibold">
              BAY DESIGNATION
            </div>
            <p className="mt-1.5 font-bold text-sm text-ink font-sans">
              {booking.listing.title}
            </p>
            <p className="mt-1 flex items-start gap-1.5 text-ink-muted">
              <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" />
              <span>
                {booking.listing.addressLine ? `${booking.listing.addressLine}, ` : ""}
                {booking.listing.area}, {booking.listing.city}
              </span>
            </p>
            {booking.listing.parkingType && (
              <p className="mt-2 text-ink-subtle">
                TYPE: {parkingTypeLabel(booking.listing.parkingType)}
              </p>
            )}
          </div>

          <div className="rounded-xl border border-line bg-canvas/60 p-4">
            <div className="text-[11px] uppercase tracking-wider text-accent font-semibold">
              TIMESTAMPS &amp; VEHICLE
            </div>
            <dl className="mt-2 space-y-1.5 text-xs">
              <div className="flex justify-between gap-2">
                <dt className="text-ink-subtle">ENTRY:</dt>
                <dd className="font-semibold text-emerald-400">
                  {formatLocalDateTime(booking.startTime)}
                </dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-ink-subtle">EXIT:</dt>
                <dd className="font-semibold text-red-400">
                  {formatLocalDateTime(booking.endTime)}
                </dd>
              </div>
              {booking.vehicleNumber && (
                <div className="flex justify-between gap-2 border-t border-line/40 pt-1.5">
                  <dt className="text-ink-subtle">REG:</dt>
                  <dd className="font-bold text-accent uppercase">
                    {booking.vehicleNumber}
                  </dd>
                </div>
              )}
            </dl>
          </div>
        </div>

        {/* Payment Summary */}
        <div className="mt-6 rounded-xl border border-line bg-canvas p-4 font-mono text-xs">
          <div className="flex items-center justify-between text-sm">
            <span className="text-ink-muted">COMMITTED TARIFF</span>
            <span className="text-xl font-bold text-ink">
              {formatInrFromPaise(booking.totalAmountPaise)}
            </span>
          </div>
          {booking.payment && (
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-line/60 pt-2 text-[11px] text-ink-subtle">
              <span>
                GATEWAY: {booking.payment.provider === "DEV_TEST" ? "LOCAL TEST MODE (NO FINANCIAL CHARGE)" : "STRIPE CHECKOUT"}
              </span>
              {booking.payment.refundedAmountPaise > 0 && (
                <span className="font-semibold text-sky-400">
                  REFUNDED: {formatInrFromPaise(booking.payment.refundedAmountPaise)}
                </span>
              )}
            </div>
          )}
        </div>

        {booking.status === "CONFIRMED" && booking.listing.instructions && (
          <div className="mt-6 rounded-xl border border-accent/30 bg-accent-soft/30 p-4 font-mono text-xs">
            <div className="flex items-start gap-2.5">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
              <div>
                <h2 className="font-semibold text-accent uppercase">
                  HOST ENTRY DIRECTIVE
                </h2>
                <p className="mt-1 text-ink leading-relaxed">
                  {booking.listing.instructions}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Cancellation Section */}
        {booking.cancellationPreview?.eligible && (
          <div className="mt-6 border-t border-line/60 pt-6">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
              <div>
                <h2 className="font-mono text-xs font-semibold text-ink uppercase tracking-wider">
                  RELEASE RESERVATION
                </h2>
                <p className="mt-1 text-xs text-ink-muted font-mono">
                  {booking.status === "PENDING_PAYMENT"
                    ? "Cancelling frees hold slot immediately with zero penalty."
                    : booking.cancellationPreview.refundAmountPaise > 0
                      ? `Eligible for ${formatInrFromPaise(booking.cancellationPreview.refundAmountPaise)} refund under policy.`
                      : "Eligible for release with zero refund."}
                  {policy ? ` (100% refund available >= ${policy.freeCancellationHoursBefore}h before arrival)` : ""}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setConfirmCancelOpen(true)}
                className="btn-danger shrink-0"
              >
                CANCEL RESERVATION
              </button>
            </div>
          </div>
        )}

        {booking.status === "CANCELLED" && (
          <div className="mt-6 rounded-lg border border-line bg-canvas p-4 font-mono text-xs text-ink-muted">
            CANCELLED AT: {booking.cancelledAt ? formatLocalDateTime(booking.cancelledAt) : "RECORD"}
            {booking.cancellationReason ? ` &middot; REASON: ${booking.cancellationReason}` : ""}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={confirmCancelOpen}
        title="CONFIRM RESERVATION RELEASE?"
        description={
          booking.status === "CONFIRMED" && (booking.cancellationPreview?.refundAmountPaise ?? 0) > 0
            ? `Release slot ${booking.reference} and process refund of ${formatInrFromPaise(booking.cancellationPreview!.refundAmountPaise)}?`
            : `Release slot ${booking.reference} immediately back into allocation pool?`
        }
        confirmLabel="YES, RELEASE SLOT"
        busy={cancelling}
        onConfirm={() => void handleCancelBooking()}
        onClose={() => setConfirmCancelOpen(false)}
      />
    </div>
  );
}
