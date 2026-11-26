import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Calendar, Cpu, MapPin, RefreshCw } from "lucide-react";
import { apiRequest } from "../lib/api";
import { formatInrFromPaise, formatLocalDateTime } from "../lib/format";
import {
  BookingStatusBadge,
  PaymentStatusBadge,
} from "../components/StatusBadge";
import type { BookingRecord } from "../types";

export function BookingsPage() {
  const [bookings, setBookings] = useState<BookingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<"upcoming" | "past">("upcoming");

  const loadBookings = useCallback(async () => {
    try {
      const data = await apiRequest<{ bookings: BookingRecord[] }>(
        "/api/bookings/my"
      );
      setBookings(data.bookings);
      setError(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load your bookings."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadBookings();
  }, [loadBookings]);

  const now = Date.now();
  const upcoming = bookings.filter(
    (b) =>
      (b.status === "CONFIRMED" || b.status === "PENDING_PAYMENT") &&
      new Date(b.endTime).getTime() > now
  );
  const past = bookings.filter(
    (b) =>
      b.status === "CANCELLED" ||
      b.status === "EXPIRED" ||
      new Date(b.endTime).getTime() <= now
  );

  const visible = tab === "upcoming" ? upcoming : past;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 font-mono text-xs">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line pb-6">
        <div>
          <div className="flex items-center gap-2 text-accent uppercase">
            <Cpu className="h-4 w-4" />
            <span>SESSION LEDGER &middot; DRIVER ALLOCATIONS</span>
          </div>
          <h1 className="mt-1.5 text-2xl font-bold tracking-tight text-ink sm:text-3xl font-sans">
            My Parking Bookings
          </h1>
          <p className="mt-1 text-ink-muted">
            Inspect active session holds, access passes, and transaction refund statuses
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => void loadBookings()}
            className="btn-secondary py-2 px-3 text-xs"
          >
            <RefreshCw className="h-3.5 w-3.5 text-accent" />
            <span>SYNC</span>
          </button>
          <Link to="/search" className="btn-primary py-2 px-3 text-xs">
            NEW ALLOCATION
          </Link>
        </div>
      </div>

      <div className="mt-6 flex gap-2 border-b border-line font-mono text-xs">
        <button
          type="button"
          onClick={() => setTab("upcoming")}
          className={`border-b-2 px-4 py-3 font-semibold uppercase tracking-wider transition-colors ${
            tab === "upcoming"
              ? "border-accent text-accent bg-accent-soft/30"
              : "border-transparent text-ink-muted hover:text-ink"
          }`}
        >
          ACTIVE &amp; SCHEDULED ({upcoming.length})
        </button>
        <button
          type="button"
          onClick={() => setTab("past")}
          className={`border-b-2 px-4 py-3 font-semibold uppercase tracking-wider transition-colors ${
            tab === "past"
              ? "border-accent text-accent bg-accent-soft/30"
              : "border-transparent text-ink-muted hover:text-ink"
          }`}
        >
          COMPLETED &amp; CANCELLED ({past.length})
        </button>
      </div>

      {error && (
        <div className="mt-6 rounded border border-red-500/40 bg-red-950/40 p-4 text-red-300">
          [!] {error}
        </div>
      )}

      {loading ? (
        <div className="card mt-6 p-8 text-ink-muted">
          SYNCHRONIZING DRIVER SESSIONS...
        </div>
      ) : visible.length === 0 ? (
        <div className="card mt-6 p-12 text-center font-mono">
          <Calendar className="mx-auto h-8 w-8 text-ink-subtle" />
          <p className="mt-3 text-sm font-semibold text-ink">
            {tab === "upcoming" ? "ZERO ACTIVE PARKING SESSIONS" : "ZERO ARCHIVED SESSIONS"}
          </p>
          <p className="mt-1 text-xs text-ink-muted">
            {tab === "upcoming" ? "Query the allocation grid to lock your next space." : "Expired and completed sessions will archive here."}
          </p>
          {tab === "upcoming" && (
            <Link to="/search" className="btn-primary mt-5">
              SEARCH PARKING BAYS
            </Link>
          )}
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          {visible.map((booking) => (
            <article
              key={booking.id}
              className="card flex flex-col justify-between gap-4 p-5 sm:flex-row sm:items-center border-line-strong bg-surface/90"
            >
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-bold text-accent">
                    {booking.reference}
                  </span>
                  <BookingStatusBadge status={booking.status} />
                  {booking.payment && (
                    <PaymentStatusBadge status={booking.payment.status} />
                  )}
                </div>

                <h2 className="mt-2 text-base font-bold text-ink font-sans">
                  {booking.listing.title}
                </h2>

                <p className="mt-1 flex items-center gap-1.5 text-xs text-ink-muted">
                  <MapPin className="h-3.5 w-3.5 text-accent" />
                  <span>
                    {booking.listing.area}, {booking.listing.city}
                  </span>
                </p>

                <p className="mt-1.5 text-xs text-ink-subtle">
                  ENTRY: {formatLocalDateTime(booking.startTime)} &rarr; EXIT: {formatLocalDateTime(booking.endTime)}
                </p>
              </div>

              <div className="flex items-center justify-between gap-4 sm:flex-col sm:items-end">
                <div className="font-mono text-lg font-bold text-ink">
                  {formatInrFromPaise(booking.totalAmountPaise)}
                </div>
                <Link
                  to={`/bookings/${booking.id}`}
                  className={
                    booking.status === "PENDING_PAYMENT"
                      ? "btn-primary py-2 px-3 text-xs"
                      : "btn-secondary py-2 px-3 text-xs"
                  }
                >
                  {booking.status === "PENDING_PAYMENT"
                    ? "COMPLETE CHECKOUT"
                    : "VIEW TICKET"}
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
