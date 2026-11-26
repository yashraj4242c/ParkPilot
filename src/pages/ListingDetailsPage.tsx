import React, { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  AlertCircle,
  ArrowLeft,
  Car,
  CheckCircle2,
  Clock,
  Cpu,
  Info,
  Layers,
  Lock,
  MapPin,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import { apiRequest } from "../lib/api";
import {
  calculateEstimatedTotalPaise,
  formatDuration,
  formatInrFromPaise,
  formatLocalDateTime,
  formatOperatingHours,
  getDefaultSearchWindow,
  parkingTypeLabel,
  toLocalDateTimeInputValue,
} from "../lib/format";
import { useAuth } from "../context/AuthContext";
import type {
  BookingRecord,
  CancellationPolicy,
  ParkingListing,
  ReservedSlot,
} from "../types";

export function ListingDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const defaults = getDefaultSearchWindow();
  const [startInput, setStartInput] = useState(
    searchParams.get("startTime")
      ? toLocalDateTimeInputValue(new Date(searchParams.get("startTime")!))
      : defaults.startInput
  );
  const [endInput, setEndInput] = useState(
    searchParams.get("endTime")
      ? toLocalDateTimeInputValue(new Date(searchParams.get("endTime")!))
      : defaults.endInput
  );

  const [vehicleNumber, setVehicleNumber] = useState("");
  const [notes, setNotes] = useState("");

  const [listing, setListing] = useState<ParkingListing | null>(null);
  const [policy, setPolicy] = useState<CancellationPolicy | null>(null);
  const [reservedSlots, setReservedSlots] = useState<ReservedSlot[]>([]);
  const [availability, setAvailability] = useState<{
    available: boolean;
    reason: string | null;
    checkedAt: string;
  } | null>(null);

  const [loading, setLoading] = useState(true);
  const [checkingSlot, setCheckingSlot] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadListing = useCallback(async () => {
    if (!id) return;
    try {
      const data = await apiRequest<{
        listing: ParkingListing;
        upcomingReservedSlots: ReservedSlot[];
        policy: CancellationPolicy;
      }>(`/api/listings/${id}`);
      setListing(data.listing);
      setReservedSlots(data.upcomingReservedSlots);
      setPolicy(data.policy);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load listing.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  const checkAvailability = useCallback(async () => {
    if (!id || !startInput || !endInput) return;
    const start = new Date(startInput);
    const end = new Date(endInput);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return;

    setCheckingSlot(true);
    try {
      const params = new URLSearchParams({
        startTime: start.toISOString(),
        endTime: end.toISOString(),
      });
      const data = await apiRequest<{
        available: boolean;
        reason: string | null;
        upcomingReservedSlots: ReservedSlot[];
        checkedAt: string;
      }>(`/api/listings/${id}/availability?${params.toString()}`);

      setAvailability({
        available: data.available,
        reason: data.reason,
        checkedAt: data.checkedAt,
      });
      setReservedSlots(data.upcomingReservedSlots);
    } catch (err) {
      setAvailability({
        available: false,
        reason:
          err instanceof Error ? err.message : "Could not verify availability.",
        checkedAt: new Date().toISOString(),
      });
    } finally {
      setCheckingSlot(false);
    }
  }, [id, startInput, endInput]);

  useEffect(() => {
    void loadListing();
  }, [loadListing]);

  useEffect(() => {
    void checkAvailability();
  }, [checkAvailability]);

  // Live polling every 10 seconds
  useEffect(() => {
    const timer = window.setInterval(() => {
      void checkAvailability();
    }, 10000);
    return () => window.clearInterval(timer);
  }, [checkAvailability]);

  const estimate = listing
    ? calculateEstimatedTotalPaise(
        startInput,
        endInput,
        listing.pricePerHourPaise
      )
    : null;

  const handleBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!listing) return;

    if (!user) {
      const next = encodeURIComponent(
        `/listings/${listing.id}?startTime=${encodeURIComponent(new Date(startInput).toISOString())}&endTime=${encodeURIComponent(new Date(endInput).toISOString())}`
      );
      navigate(`/login?redirect=${next}`);
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const data = await apiRequest<{ booking: BookingRecord }>("/api/bookings", {
        method: "POST",
        body: JSON.stringify({
          listingId: listing.id,
          startTime: new Date(startInput).toISOString(),
          endTime: new Date(endInput).toISOString(),
          vehicleNumber: vehicleNumber.trim() || undefined,
          notes: notes.trim() || undefined,
        }),
      });
      navigate(`/bookings/${data.booking.id}`);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not create reservation hold."
      );
      void checkAvailability();
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="card border-line/60 p-8 font-mono text-xs text-ink-muted">
          INITIALIZING BAY TELEMETRY...
        </div>
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <div className="card p-8 text-center border-red-500/40">
          <h1 className="font-mono text-lg font-bold text-red-400">NODE NOT FOUND</h1>
          <p className="mt-2 text-xs font-mono text-ink-muted">
            {error || "The requested parking space record is not available."}
          </p>
          <Link to="/search" className="btn-secondary mt-5">
            RETURN TO SEARCH
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <Link
        to="/search"
        className="inline-flex items-center gap-2 font-mono text-xs text-ink-muted hover:text-accent transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        <span>BACK TO ALLOCATION GRID</span>
      </Link>

      <div className="mt-6 grid grid-cols-1 gap-8 lg:grid-cols-12">
        {/* Left: Listing & Technical Details */}
        <div className="space-y-6 lg:col-span-7">
          <div className="card border-line-strong p-6 sm:p-8 bg-surface/90">
            <div className="flex flex-wrap items-center gap-2">
              <span className="telemetry-pill bg-canvas text-accent border-accent/30">
                <Layers className="h-3 w-3" />
                {parkingTypeLabel(listing.parkingType)}
              </span>
              {listing.isSample && (
                <span className="telemetry-pill bg-canvas text-ink-subtle">
                  SIMULATION NODE
                </span>
              )}
              {(!listing.isActive || !listing.isApproved) && (
                <span className="telemetry-pill border-amber-500/40 bg-amber-950/40 text-amber-300">
                  OFFLINE / SUSPENDED
                </span>
              )}
            </div>

            <h1 className="mt-4 text-2xl font-bold tracking-tight text-ink sm:text-3xl font-sans">
              {listing.title}
            </h1>

            <p className="mt-3 text-sm leading-relaxed text-ink-muted">
              {listing.description}
            </p>

            {/* Tactical Location Box */}
            <div className="mt-6 rounded-xl border border-line bg-canvas-card/80 p-4 font-mono">
              <div className="flex items-start gap-3">
                <div className="rounded-lg border border-accent/30 bg-accent/10 p-2 text-accent">
                  <MapPin className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-ink-subtle font-semibold">
                    PHYSICAL GEO-COORDINATES &amp; ACCESS ADDRESS
                  </div>
                  <div className="mt-1 text-sm font-semibold text-ink">
                    {listing.addressLine}
                  </div>
                  <div className="text-xs text-ink-muted">
                    {listing.area}, {listing.city} {listing.postalCode ? ` - ${listing.postalCode}` : ""}
                  </div>
                </div>
              </div>
            </div>

            {/* Technical Spec Matrix */}
            <dl className="mt-6 grid grid-cols-1 gap-4 border-t border-line/60 pt-6 sm:grid-cols-2 font-mono text-xs">
              <div className="rounded border border-line/50 bg-canvas/40 p-3">
                <dt className="flex items-center gap-1.5 text-ink-subtle">
                  <Clock className="h-3.5 w-3.5 text-accent" />
                  <span>OPERATING WINDOW</span>
                </dt>
                <dd className="mt-1.5 font-bold text-ink">
                  {formatOperatingHours(listing.availableFromHour, listing.availableToHour)}
                </dd>
              </div>

              <div className="rounded border border-line/50 bg-canvas/40 p-3">
                <dt className="flex items-center gap-1.5 text-ink-subtle">
                  <Car className="h-3.5 w-3.5 text-emerald-400" />
                  <span>COMPATIBLE VEHICLES</span>
                </dt>
                <dd className="mt-1.5 font-bold text-ink">
                  {listing.vehicleCompatibility || "Standard passenger vehicles"}
                </dd>
              </div>
            </dl>

            {listing.instructions && (
              <div className="mt-6 rounded-xl border border-accent/30 bg-accent-soft/40 p-4">
                <div className="flex items-start gap-3">
                  <Info className="h-4 w-4 text-accent mt-0.5 shrink-0" />
                  <div>
                    <h2 className="font-mono text-xs font-semibold uppercase tracking-wider text-accent">
                      HOST ACCESS DIRECTIVES
                    </h2>
                    <p className="mt-1 text-xs text-ink leading-relaxed">
                      {listing.instructions}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Reserved Slot Schedule Ledger */}
          <div className="card border-line-strong p-6 bg-surface/90">
            <div className="flex items-center justify-between border-b border-line/60 pb-3">
              <div className="flex items-center gap-2">
                <Cpu className="h-4 w-4 text-accent" />
                <h2 className="font-mono text-xs font-semibold text-ink uppercase tracking-wider">
                  BAY TIME-WINDOW LEDGER
                </h2>
              </div>
              <button
                type="button"
                onClick={() => void checkAvailability()}
                className="flex items-center gap-1 text-[11px] font-mono text-ink-muted hover:text-accent"
              >
                <RefreshCw className={`h-3 w-3 ${checkingSlot ? "animate-spin" : ""}`} />
                <span>SYNC</span>
              </button>
            </div>
            <p className="mt-2 text-xs font-mono text-ink-muted">
              Database locks out overlapping time ranges. Adjacent bookings (one ends as next begins) are permitted.
            </p>

            {reservedSlots.length === 0 ? (
              <div className="mt-4 rounded border border-line/40 bg-canvas/60 p-3.5 font-mono text-xs text-emerald-400">
                [+] ZERO UPCOMING RESERVATIONS &middot; 100% SLOT CAPACITY OPEN
              </div>
            ) : (
              <ul className="mt-4 space-y-2 font-mono">
                {reservedSlots.map((slot, idx) => (
                  <li
                    key={`${slot.startTime}-${idx}`}
                    className="flex flex-wrap items-center justify-between gap-2 rounded border border-line bg-canvas px-3 py-2 text-xs"
                  >
                    <span className="text-ink">
                      {formatLocalDateTime(slot.startTime)} &rarr; {formatLocalDateTime(slot.endTime)}
                    </span>
                    <span
                      className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded border ${
                        slot.status === "PENDING_PAYMENT"
                          ? "border-amber-500/40 bg-amber-950/40 text-amber-300"
                          : "border-emerald-500/40 bg-emerald-950/40 text-emerald-400"
                      }`}
                    >
                      {slot.status === "PENDING_PAYMENT" ? "TEMPORARY HOLD" : "CONFIRMED"}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {policy && (
            <div className="card border-line/60 p-6 font-mono text-xs">
              <div className="flex items-center gap-2 text-accent font-semibold uppercase tracking-wider">
                <ShieldCheck className="h-4 w-4" />
                <span>REFUND &amp; CANCELLATION PROTOCOL</span>
              </div>
              <ul className="mt-3 space-y-1.5 text-ink-muted">
                <li>&bull; Unpaid holds release automatically after {policy.holdDurationMinutes} minutes.</li>
                <li>&bull; 100% refund confirmed if cancelled &ge; {policy.freeCancellationHoursBefore}h before arrival.</li>
                <li>&bull; {policy.partialRefundPercent}% refund if cancelled inside {policy.freeCancellationHoursBefore}h of arrival.</li>
                <li>&bull; Zero refund once scheduled entry timestamp has passed.</li>
              </ul>
            </div>
          )}
        </div>

        {/* Right: Booking Action Terminal */}
        <div className="lg:col-span-5">
          <div className="card sticky top-24 border-line-strong bg-canvas-panel/95 p-6 shadow-terminal">
            <div className="flex items-baseline justify-between border-b border-line pb-4 font-mono">
              <div>
                <span className="text-3xl font-extrabold text-ink font-sans">
                  {formatInrFromPaise(listing.pricePerHourPaise)}
                </span>
                <span className="text-xs text-ink-muted"> / HOUR</span>
              </div>
              <span className="text-[11px] text-accent uppercase">
                HOST: {listing.ownerName || "VERIFIED"}
              </span>
            </div>

            <form onSubmit={handleBook} className="mt-5 space-y-4">
              <div>
                <label
                  htmlFor="book-start"
                  className="mb-1.5 block font-mono text-xs font-medium text-ink-muted"
                >
                  ENTRY TIMESTAMP
                </label>
                <input
                  id="book-start"
                  type="datetime-local"
                  value={startInput}
                  onChange={(e) => setStartInput(e.target.value)}
                  required
                  className="input-field"
                />
              </div>

              <div>
                <label
                  htmlFor="book-end"
                  className="mb-1.5 block font-mono text-xs font-medium text-ink-muted"
                >
                  EXIT TIMESTAMP
                </label>
                <input
                  id="book-end"
                  type="datetime-local"
                  value={endInput}
                  onChange={(e) => setEndInput(e.target.value)}
                  required
                  className="input-field"
                />
              </div>

              <div>
                <label
                  htmlFor="vehicle-number"
                  className="mb-1.5 block font-mono text-xs font-medium text-ink-muted"
                >
                  VEHICLE REGISTRATION NUMBER (OPTIONAL)
                </label>
                <input
                  id="vehicle-number"
                  type="text"
                  maxLength={24}
                  value={vehicleNumber}
                  onChange={(e) => setVehicleNumber(e.target.value)}
                  placeholder="e.g. KA 01 AB 1234"
                  className="input-field uppercase"
                />
              </div>

              <div>
                <label
                  htmlFor="booking-notes"
                  className="mb-1.5 block font-mono text-xs font-medium text-ink-muted"
                >
                  ACCESS NOTE FOR HOST (OPTIONAL)
                </label>
                <textarea
                  id="booking-notes"
                  rows={2}
                  maxLength={300}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Sedan, arriving on schedule"
                  className="input-field"
                />
              </div>

              {/* Live availability telemetry alert */}
              {availability && (
                <div
                  className={`rounded-lg border p-3.5 font-mono text-xs ${
                    availability.available
                      ? "border-emerald-500/40 bg-emerald-950/40 text-emerald-300"
                      : "border-amber-500/40 bg-amber-950/40 text-amber-300"
                  }`}
                >
                  <div className="flex items-start gap-2">
                    {availability.available ? (
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                    ) : (
                      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
                    )}
                    <div>
                      <div className="font-semibold uppercase">
                        {availability.available
                          ? "SLOT VERIFIED & AVAILABLE"
                          : "LOCK CONFLICT DETECTED"}
                      </div>
                      {availability.reason && (
                        <div className="mt-0.5 text-[11px] opacity-90">{availability.reason}</div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Tariff calculation breakdown */}
              {estimate && (
                <div className="space-y-2 rounded-lg border border-line bg-canvas p-4 font-mono text-xs">
                  <div className="flex justify-between text-ink-muted">
                    <span>DURATION</span>
                    <span className="text-ink font-semibold">{formatDuration(estimate.durationMinutes)}</span>
                  </div>
                  <div className="flex justify-between border-t border-line/60 pt-2 font-bold text-sm text-ink">
                    <span>TOTAL TARIFF</span>
                    <span className="text-accent">{formatInrFromPaise(estimate.totalAmountPaise)}</span>
                  </div>
                </div>
              )}

              {error && (
                <div className="rounded-lg border border-red-500/40 bg-red-950/40 p-3 font-mono text-xs text-red-300">
                  [!] ERROR: {error}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting || checkingSlot || !availability?.available || !estimate}
                className="btn-primary w-full py-3.5"
              >
                <Lock className="h-4 w-4" />
                <span>
                  {submitting
                    ? "EXECUTING DATABASE LOCK..."
                    : user
                      ? "ENGAGE RESERVATION HOLD"
                      : "AUTHENTICATE TO RESERVE"}
                </span>
              </button>

              <p className="text-center font-mono text-[11px] text-ink-subtle">
                Tariff and concurrency lock validated atomically by backend.
              </p>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
