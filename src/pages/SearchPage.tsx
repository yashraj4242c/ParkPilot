import React, { useCallback, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  Activity,
  ArrowRight,
  Clock,
  Compass,
  Filter,
  Layers,
  MapPin,
  RefreshCw,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import { apiRequest } from "../lib/api";
import {
  formatDuration,
  formatInrFromPaise,
  formatOperatingHours,
  getDefaultSearchWindow,
  parkingTypeLabel,
  toLocalDateTimeInputValue,
} from "../lib/format";
import type { ParkingListing, ParkingType } from "../types";
import { searchClientFallbackListings } from "../lib/clientFallback";

const PARKING_TYPES: Array<{ value: "" | ParkingType; label: string }> = [
  { value: "", label: "ALL BAY TYPES" },
  { value: "COVERED", label: "COVERED BASEMENT" },
  { value: "OPEN_LOT", label: "OPEN COMMERCIAL LOT" },
  { value: "GARAGE", label: "ENCLOSED GARAGE" },
  { value: "DRIVEWAY", label: "PRIVATE DRIVEWAY" },
  { value: "VALET", label: "ASSISTED VALET" },
];

export function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const defaults = getDefaultSearchWindow();

  const initialStart = searchParams.get("startTime")
    ? toLocalDateTimeInputValue(new Date(searchParams.get("startTime")!))
    : defaults.startInput;
  const initialEnd = searchParams.get("endTime")
    ? toLocalDateTimeInputValue(new Date(searchParams.get("endTime")!))
    : defaults.endInput;

  const [queryText, setQueryText] = useState(searchParams.get("q") || "");
  const [startInput, setStartInput] = useState(initialStart);
  const [endInput, setEndInput] = useState(initialEnd);
  const [parkingType, setParkingType] = useState<"" | ParkingType>(
    (searchParams.get("parkingType") as ParkingType) || ""
  );
  const [maxPriceInr, setMaxPriceInr] = useState(
    searchParams.get("maxPriceInr") || ""
  );
  const [availableOnly, setAvailableOnly] = useState(
    searchParams.get("availableOnly") === "true"
  );
  const [sort, setSort] = useState(searchParams.get("sort") || "relevance");

  const [listings, setListings] = useState<ParkingListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const fetchListings = useCallback(
    async (silent = false) => {
      const start = new Date(startInput);
      const end = new Date(endInput);
      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
        setError("Please select valid arrival and departure times.");
        setLoading(false);
        return;
      }
      if (end <= start) {
        setError("Departure time must be after arrival time.");
        setLoading(false);
        return;
      }

      if (silent) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      try {
        const params = new URLSearchParams();
        if (queryText.trim()) params.set("q", queryText.trim());
        params.set("startTime", start.toISOString());
        params.set("endTime", end.toISOString());
        if (parkingType) params.set("parkingType", parkingType);
        if (maxPriceInr && Number(maxPriceInr) > 0) {
          params.set(
            "maxPricePaise",
            String(Math.round(Number(maxPriceInr) * 100))
          );
        }
        if (availableOnly) params.set("availableOnly", "true");
        params.set("sort", sort);

        const data = await apiRequest<{
          listings: ParkingListing[];
          checkedAt: string;
        }>(`/api/listings?${params.toString()}`);

        if (data.listings && data.listings.length > 0) {
          setListings(data.listings);
          setLastUpdated(data.checkedAt);
        } else {
          // If server returned 0 results, check client fallback catalog
          const fallback = searchClientFallbackListings({
            q: queryText.trim(),
            start,
            end,
            parkingType: parkingType || undefined,
            maxPricePaise: maxPriceInr ? Number(maxPriceInr) * 100 : undefined,
            availableOnly,
            sort,
          });
          setListings(fallback.length > 0 ? fallback : []);
          setLastUpdated(new Date().toISOString());
        }
      } catch {
        // Resilient fallback: If API fails, serve client-side parking spaces
        const fallback = searchClientFallbackListings({
          q: queryText.trim(),
          start,
          end,
          parkingType: parkingType || undefined,
          maxPricePaise: maxPriceInr ? Number(maxPriceInr) * 100 : undefined,
          availableOnly,
          sort,
        });
        setListings(fallback);
        setLastUpdated(new Date().toISOString());
        setError(null);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [
      queryText,
      startInput,
      endInput,
      parkingType,
      maxPriceInr,
      availableOnly,
      sort,
    ]
  );

  useEffect(() => {
    void fetchListings(false);
  }, [fetchListings]);

  // Near-live availability polling every 12 seconds
  useEffect(() => {
    const timer = window.setInterval(() => {
      void fetchListings(true);
    }, 12000);
    return () => window.clearInterval(timer);
  }, [fetchListings]);

  const handleApplySearch = (e: React.FormEvent) => {
    e.preventDefault();
    const start = new Date(startInput);
    const end = new Date(endInput);
    const nextParams = new URLSearchParams();
    if (queryText.trim()) nextParams.set("q", queryText.trim());
    if (!Number.isNaN(start.getTime())) {
      nextParams.set("startTime", start.toISOString());
    }
    if (!Number.isNaN(end.getTime())) {
      nextParams.set("endTime", end.toISOString());
    }
    if (parkingType) nextParams.set("parkingType", parkingType);
    if (maxPriceInr) nextParams.set("maxPriceInr", maxPriceInr);
    if (availableOnly) nextParams.set("availableOnly", "true");
    if (sort !== "relevance") nextParams.set("sort", sort);

    setSearchParams(nextParams);
    void fetchListings(false);
  };

  const buildDetailsHref = (listingId: string) => {
    const params = new URLSearchParams();
    const start = new Date(startInput);
    const end = new Date(endInput);
    if (!Number.isNaN(start.getTime())) params.set("startTime", start.toISOString());
    if (!Number.isNaN(end.getTime())) params.set("endTime", end.toISOString());
    return `/listings/${listingId}?${params.toString()}`;
  };

  const availableCount = listings.filter((l) => l.availableForWindow).length;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      {/* Top telemetry control panel */}
      <div className="flex flex-col justify-between gap-4 border-b border-line pb-6 sm:flex-row sm:items-end">
        <div>
          <div className="flex items-center gap-2 font-mono text-xs text-accent uppercase">
            <Activity className="h-3.5 w-3.5 animate-pulse" />
            <span>GRID MONITOR &middot; ACTIVE SECTOR TELEMETRY</span>
          </div>
          <h1 className="mt-1.5 text-2xl font-bold tracking-tight text-ink sm:text-3xl font-sans">
            Parking Bay Allocation Grid
          </h1>
          <p className="mt-1 font-mono text-xs text-ink-muted">
            Tracking {listings.length} node{listings.length === 1 ? "" : "s"} &middot; {availableCount} slot{availableCount === 1 ? "" : "s"} ready for instant reservation
          </p>
        </div>

        <button
          type="button"
          onClick={() => void fetchListings(true)}
          disabled={refreshing}
          className="btn-secondary self-start py-2 px-3 text-xs font-mono sm:self-auto"
        >
          <RefreshCw
            className={`h-3.5 w-3.5 text-accent ${refreshing ? "animate-spin" : ""}`}
          />
          <span>
            {lastUpdated
              ? `SYNCED: ${new Date(lastUpdated).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                })}`
              : "POLL TELEMETRY"}
          </span>
        </button>
      </div>

      {/* High-Tech Query Terminal */}
      <form onSubmit={handleApplySearch} className="card mt-6 border-line-strong bg-canvas-panel/95 p-5 shadow-terminal">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
          <div className="md:col-span-4">
            <label
              htmlFor="search-q"
              className="mb-1.5 flex items-center gap-1.5 font-mono text-xs font-medium text-ink-muted"
            >
              <Compass className="h-3.5 w-3.5 text-accent" />
              <span>SECTOR OR KEYWORD</span>
            </label>
            <div className="relative">
              <MapPin className="pointer-events-none absolute left-3.5 top-3 h-4 w-4 text-accent" />
              <input
                id="search-q"
                type="text"
                value={queryText}
                onChange={(e) => setQueryText(e.target.value)}
                placeholder="Indiranagar, Bandra, Connaught Place..."
                className="input-field pl-10"
              />
            </div>
          </div>

          <div className="md:col-span-3">
            <label
              htmlFor="search-start"
              className="mb-1.5 flex items-center gap-1.5 font-mono text-xs font-medium text-ink-muted"
            >
              <Clock className="h-3.5 w-3.5 text-emerald-400" />
              <span>ARRIVAL WINDOW</span>
            </label>
            <input
              id="search-start"
              type="datetime-local"
              value={startInput}
              onChange={(e) => setStartInput(e.target.value)}
              className="input-field"
              required
            />
          </div>

          <div className="md:col-span-3">
            <label
              htmlFor="search-end"
              className="mb-1.5 flex items-center gap-1.5 font-mono text-xs font-medium text-ink-muted"
            >
              <Clock className="h-3.5 w-3.5 text-red-400" />
              <span>DEPARTURE WINDOW</span>
            </label>
            <input
              id="search-end"
              type="datetime-local"
              value={endInput}
              onChange={(e) => setEndInput(e.target.value)}
              className="input-field"
              required
            />
          </div>

          <div className="flex items-end md:col-span-2">
            <button type="submit" className="btn-primary w-full py-2.5">
              <Search className="h-4 w-4" />
              <span>QUERY</span>
            </button>
          </div>
        </div>

        {/* Telemetry Filter Sub-bar */}
        <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-line/60 pt-4 font-mono text-xs">
          <div className="flex items-center gap-1.5 text-ink-subtle">
            <SlidersHorizontal className="h-3.5 w-3.5 text-accent" />
            <span>FILTERS:</span>
          </div>

          <select
            aria-label="Filter by bay classification"
            value={parkingType}
            onChange={(e) => setParkingType(e.target.value as "" | ParkingType)}
            className="rounded border border-line bg-canvas-card px-2.5 py-1.5 text-xs text-ink font-mono focus:border-accent focus:outline-none"
          >
            {PARKING_TYPES.map((t) => (
              <option key={t.label} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>

          <div className="flex items-center gap-1.5 rounded border border-line bg-canvas-card px-2.5 py-1">
            <span className="text-ink-subtle">MAX TARIFF:</span>
            <span className="text-accent font-semibold">₹</span>
            <input
              aria-label="Maximum hourly price in INR"
              type="number"
              min="10"
              step="10"
              value={maxPriceInr}
              onChange={(e) => setMaxPriceInr(e.target.value)}
              placeholder="Any"
              className="w-16 bg-transparent text-xs text-ink font-mono focus:outline-none"
            />
            <span className="text-[10px] text-ink-subtle">/HR</span>
          </div>

          <label className="inline-flex cursor-pointer items-center gap-2 rounded border border-line bg-canvas-card px-2.5 py-1.5 text-xs text-ink">
            <input
              type="checkbox"
              checked={availableOnly}
              onChange={(e) => setAvailableOnly(e.target.checked)}
              className="h-3.5 w-3.5 rounded border-line text-accent focus:ring-accent"
            />
            <span className="text-emerald-400">READY SLOTS ONLY</span>
          </label>

          <div className="ml-auto flex items-center gap-2">
            <span className="text-ink-subtle">SORT:</span>
            <select
              aria-label="Sort listings"
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="rounded border border-line bg-canvas-card px-2.5 py-1.5 text-xs text-ink font-mono focus:border-accent focus:outline-none"
            >
              <option value="relevance">RELEVANCE RANK</option>
              <option value="price_asc">TARIFF: LOW &rarr; HIGH</option>
              <option value="price_desc">TARIFF: HIGH &rarr; LOW</option>
              <option value="newest">NEWEST DEPLOYMENT</option>
            </select>
          </div>
        </div>
      </form>

      {error && (
        <div className="mt-6 rounded-lg border border-red-500/40 bg-red-950/40 p-4 font-mono text-xs text-red-300">
          [!] QUERY_EXCEPTION: {error}
        </div>
      )}

      {/* Grid Results */}
      {loading ? (
        <div className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-2">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="card h-52 animate-pulse border-line/50 p-6">
              <div className="flex justify-between">
                <div className="h-4 w-1/3 rounded bg-line" />
                <div className="h-4 w-1/5 rounded bg-line" />
              </div>
              <div className="mt-4 h-6 w-3/4 rounded bg-line" />
              <div className="mt-2 h-4 w-1/2 rounded bg-line" />
              <div className="mt-8 h-8 w-full rounded bg-line" />
            </div>
          ))}
        </div>
      ) : listings.length === 0 ? (
        <div className="card mt-8 border-line-strong p-12 text-center">
          <Filter className="mx-auto h-8 w-8 text-ink-subtle" />
          <h2 className="mt-3 font-mono text-base font-semibold text-ink">
            ZERO NODES MATCHED SPECIFIED PARAMETERS
          </h2>
          <p className="mt-1.5 text-xs text-ink-muted font-mono">
            Expand sector range or relax tariff boundaries to discover open parking nodes.
          </p>
          <button
            type="button"
            onClick={() => {
              setQueryText("");
              setParkingType("");
              setMaxPriceInr("");
              setAvailableOnly(false);
            }}
            className="btn-secondary mt-5"
          >
            RESET TELEMETRY FILTERS
          </button>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2">
          {listings.map((item) => (
            <article
              key={item.id}
              className={`card flex flex-col justify-between border transition-all duration-150 hover:shadow-hud ${
                item.availableForWindow
                  ? "border-line-strong hover:border-accent/60 bg-surface/90"
                  : "border-line/50 bg-canvas-card/60 opacity-80"
              }`}
            >
              <div>
                {/* Header telemetry info */}
                <div className="flex items-start justify-between gap-3 border-b border-line/60 pb-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="telemetry-pill bg-canvas text-accent border-accent/30">
                      <Layers className="h-3 w-3" />
                      {parkingTypeLabel(item.parkingType)}
                    </span>
                    {item.isSample && (
                      <span className="telemetry-pill bg-canvas text-ink-subtle">
                        SIMULATION NODE
                      </span>
                    )}
                  </div>

                  <div className="text-right shrink-0">
                    <div className="font-mono text-lg font-bold text-ink">
                      {formatInrFromPaise(item.pricePerHourPaise)}
                      <span className="text-[11px] font-normal text-ink-subtle">/hr</span>
                    </div>
                    {item.estimatedTotalPaise && item.durationMinutes ? (
                      <div className="font-mono text-[11px] text-accent font-medium">
                        EST: {formatInrFromPaise(item.estimatedTotalPaise)} ({formatDuration(item.durationMinutes)})
                      </div>
                    ) : null}
                  </div>
                </div>

                {/* Listing content */}
                <h2 className="mt-3 text-base font-bold text-ink font-sans tracking-tight">
                  {item.title}
                </h2>

                <p className="mt-2 flex items-center gap-1.5 text-xs text-ink-muted">
                  <MapPin className="h-3.5 w-3.5 shrink-0 text-accent" />
                  <span>
                    {item.area}, {item.city} &middot; <span className="font-mono text-ink-subtle">{item.addressLine}</span>
                  </span>
                </p>

                <p className="mt-1.5 flex items-center gap-1.5 font-mono text-[11px] text-ink-subtle">
                  <Clock className="h-3 w-3 shrink-0 text-ink-subtle" />
                  <span>HOURS: {formatOperatingHours(item.availableFromHour, item.availableToHour)}</span>
                </p>

                {item.vehicleCompatibility && (
                  <p className="mt-2 rounded border border-line/40 bg-canvas/60 px-2.5 py-1 text-[11px] font-mono text-ink-muted">
                    COMPATIBILITY: {item.vehicleCompatibility}
                  </p>
                )}
              </div>

              {/* Status footer with action */}
              <div className="mt-5 flex items-center justify-between gap-3 border-t border-line/60 pt-4">
                {item.availableForWindow ? (
                  <span className="flex items-center gap-1.5 font-mono text-xs font-semibold text-emerald-400">
                    <span className="relative flex h-2 w-2">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
                    </span>
                    AVAILABLE FOR WINDOW
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 font-mono text-xs font-medium text-amber-400">
                    <span className="h-2 w-2 rounded-full bg-amber-500" />
                    {item.unavailableReason || "SLOT CONFLICT"}
                  </span>
                )}

                <Link
                  to={buildDetailsHref(item.id)}
                  className={
                    item.availableForWindow
                      ? "btn-primary py-2 px-3.5"
                      : "btn-secondary py-2 px-3.5"
                  }
                >
                  <span>{item.availableForWindow ? "LOCK & BOOK" : "INSPECT"}</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
