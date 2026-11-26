import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Clock,
  Compass,
  Cpu,
  Database,
  Lock,
  MapPin,
  Radio,
  Search,
  ShieldCheck,
  Zap,
} from "lucide-react";
import { getDefaultSearchWindow } from "../lib/format";
import { useAuth } from "../context/AuthContext";

export function HomePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const defaults = getDefaultSearchWindow();

  const [location, setLocation] = useState("");
  const [startTime, setStartTime] = useState(defaults.startInput);
  const [endTime, setEndTime] = useState(defaults.endInput);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const start = new Date(startTime);
    const end = new Date(endTime);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      setError("Please select valid arrival and departure times.");
      return;
    }
    if (end <= start) {
      setError("Departure time must be strictly after arrival time.");
      return;
    }

    const params = new URLSearchParams();
    if (location.trim()) params.set("q", location.trim());
    params.set("startTime", start.toISOString());
    params.set("endTime", end.toISOString());

    navigate(`/search?${params.toString()}`);
  };

  const quickSearch = (area: string) => {
    const params = new URLSearchParams();
    params.set("q", area);
    const start = new Date(startTime);
    const end = new Date(endTime);
    if (!Number.isNaN(start.getTime())) params.set("startTime", start.toISOString());
    if (!Number.isNaN(end.getTime())) params.set("endTime", end.toISOString());
    navigate(`/search?${params.toString()}`);
  };

  return (
    <div className="relative overflow-hidden">
      {/* Background radial glow & grid matrix */}
      <div className="pointer-events-none absolute inset-0 bg-grid-pattern opacity-40" />
      <div className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 h-[500px] w-[900px] bg-radar-radial opacity-60" />

      {/* Hero Terminal Interface */}
      <section className="relative z-10 mx-auto max-w-7xl px-4 pt-12 pb-16 sm:px-6 lg:pt-16 lg:pb-24">
        {/* Telemetry status badge */}
        <div className="inline-flex items-center gap-2 rounded-full border border-accent/40 bg-accent-soft/50 px-3 py-1 font-mono text-xs text-accent">
          <Radio className="h-3.5 w-3.5 animate-pulse text-accent" />
          <span>REAL-TIME BAY TELEMETRY &amp; OVERLAP PREVENTION ENGINE</span>
        </div>

        <div className="mt-5 max-w-3xl">
          <h1 className="text-3xl font-extrabold tracking-tight text-ink sm:text-5xl lg:text-6xl font-sans">
            Guaranteed parking slots. <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent via-accent-glow to-emerald-400">
              Zero scheduling conflicts.
            </span>
          </h1>
          <p className="mt-4 text-base font-normal leading-relaxed text-ink-muted sm:text-lg">
            High-precision parking reservation terminal. Every bay reservation executes with database-level isolation locks to ensure no two vehicles ever book the same time slot.
          </p>
        </div>

        {/* Tactical Search Terminal Box */}
        <div className="mt-10 rounded-2xl border border-line-strong bg-canvas-panel/95 p-6 shadow-terminal backdrop-blur-xl">
          <div className="flex items-center justify-between border-b border-line pb-4 text-xs font-mono text-ink-muted">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-accent animate-ping" />
              <span className="font-semibold text-ink uppercase tracking-wider">
                BAY ALLOCATION TERMINAL
              </span>
            </div>
            <span className="text-[11px] text-ink-subtle hidden sm:inline">
              COORDINATES: IST [UTC+05:30] &middot; BTREE_GIST ISOLATION
            </span>
          </div>

          <form onSubmit={handleSearch} className="mt-6">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-12 md:items-end">
              <div className="md:col-span-4">
                <label
                  htmlFor="home-location"
                  className="mb-2 flex items-center justify-between text-xs font-mono font-medium text-ink-muted"
                >
                  <span className="flex items-center gap-1.5 text-accent">
                    <Compass className="h-3.5 w-3.5" />
                    TARGET SECTOR / CITY
                  </span>
                  <span className="text-[10px] text-ink-subtle">ZONE SEARCH</span>
                </label>
                <div className="relative">
                  <MapPin className="pointer-events-none absolute left-3.5 top-3 h-4 w-4 text-accent" />
                  <input
                    id="home-location"
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="e.g. Indiranagar, Koramangala, Bandra..."
                    className="input-field pl-10"
                  />
                </div>
              </div>

              <div className="md:col-span-3">
                <label
                  htmlFor="home-arrival"
                  className="mb-2 flex items-center gap-1.5 text-xs font-mono font-medium text-ink-muted"
                >
                  <Clock className="h-3.5 w-3.5 text-emerald-400" />
                  <span>ENTRY TIMESTAMP</span>
                </label>
                <input
                  id="home-arrival"
                  type="datetime-local"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  required
                  className="input-field"
                />
              </div>

              <div className="md:col-span-3">
                <label
                  htmlFor="home-departure"
                  className="mb-2 flex items-center gap-1.5 text-xs font-mono font-medium text-ink-muted"
                >
                  <Clock className="h-3.5 w-3.5 text-red-400" />
                  <span>EXIT TIMESTAMP</span>
                </label>
                <input
                  id="home-departure"
                  type="datetime-local"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  required
                  className="input-field"
                />
              </div>

              <div className="md:col-span-2">
                <button type="submit" className="btn-primary w-full py-3">
                  <Search className="h-4 w-4" />
                  <span>ENGAGE</span>
                </button>
              </div>
            </div>

            {error && (
              <div className="mt-4 rounded-lg border border-red-500/40 bg-red-950/40 p-3 font-mono text-xs text-red-300">
                [!] ERROR: {error}
              </div>
            )}

            {/* Quick Sector Pills */}
            <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-line/50 pt-4 text-xs font-mono">
              <span className="text-ink-subtle">HIGH-DENSITY HUBS:</span>
              {["Indiranagar", "Koramangala", "Bandra West", "Lower Parel", "Connaught Place"].map((hub) => (
                <button
                  key={hub}
                  type="button"
                  onClick={() => quickSearch(hub)}
                  className="rounded border border-line bg-surface/50 px-2 py-0.5 text-ink-muted hover:border-accent hover:text-accent transition-colors"
                >
                  {hub}
                </button>
              ))}
            </div>
          </form>
        </div>

        {/* Telemetry Metric Cards */}
        <div className="mt-12 grid grid-cols-2 gap-4 md:grid-cols-4">
          <div className="card border-line/60 bg-canvas-card/60 p-4">
            <div className="flex items-center gap-2 font-mono text-xs text-accent">
              <Lock className="h-4 w-4" />
              <span>OVERLAP LOCK</span>
            </div>
            <div className="mt-2 font-mono text-2xl font-bold text-ink">100.0%</div>
            <p className="mt-1 text-[11px] text-ink-muted">PostgreSQL exclusion constraint enforced</p>
          </div>

          <div className="card border-line/60 bg-canvas-card/60 p-4">
            <div className="flex items-center gap-2 font-mono text-xs text-emerald-400">
              <Zap className="h-4 w-4" />
              <span>LOCK SPEED</span>
            </div>
            <div className="mt-2 font-mono text-2xl font-bold text-ink">&lt; 35ms</div>
            <p className="mt-1 text-[11px] text-ink-muted">Row-level transaction serialize check</p>
          </div>

          <div className="card border-line/60 bg-canvas-card/60 p-4">
            <div className="flex items-center gap-2 font-mono text-xs text-accent-glow">
              <Database className="h-4 w-4" />
              <span>SLOT LEDGER</span>
            </div>
            <div className="mt-2 font-mono text-2xl font-bold text-ink">ACTIVE</div>
            <p className="mt-1 text-[11px] text-ink-muted">Integer minor units (Paise integrity)</p>
          </div>

          <div className="card border-line/60 bg-canvas-card/60 p-4">
            <div className="flex items-center gap-2 font-mono text-xs text-teal-400">
              <ShieldCheck className="h-4 w-4" />
              <span>AUTO-RELEASE</span>
            </div>
            <div className="mt-2 font-mono text-2xl font-bold text-ink">15 MIN</div>
            <p className="mt-1 text-[11px] text-ink-muted">Unpaid holding slot auto-expiry window</p>
          </div>
        </div>
      </section>

      {/* Architecture & Protocol Section */}
      <section className="relative z-10 border-t border-line/80 bg-canvas-subtle/80 py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-accent">
              <Cpu className="h-3.5 w-3.5" />
              <span>Operational Protocol</span>
            </div>
            <h2 className="mt-2 text-2xl font-bold text-ink sm:text-3xl font-sans">
              Three-stage reservation telemetry
            </h2>
            <p className="mt-2 text-sm text-ink-muted">
              Designed from ground up to replace informal parking guesswork with strict verifiable booking state machines.
            </p>
          </div>

          <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-3">
            <div className="card relative overflow-hidden p-6 border-line hover:border-accent/50">
              <div className="font-mono text-xs font-semibold text-accent">[01 / TARGET]</div>
              <h3 className="mt-3 text-lg font-semibold text-ink font-sans">
                Precision Spatial Query
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-muted">
                Search verified slots with arrival-to-departure parameters. Only spaces with open operating hours and zero conflict are flagged as available.
              </p>
              <div className="mt-4 rounded border border-line/60 bg-canvas/60 p-2.5 font-mono text-[11px] text-ink-subtle">
                QUERY: [tstzrange(start, end) &amp;&amp; existing] = FALSE
              </div>
            </div>

            <div className="card relative overflow-hidden p-6 border-line hover:border-accent/50">
              <div className="font-mono text-xs font-semibold text-accent">[02 / LOCK]</div>
              <h3 className="mt-3 text-lg font-semibold text-ink font-sans">
                15-Minute Payment Hold
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-muted">
                Upon initiating reservation, the space is locked exclusively in the ledger. Unpaid slots expire cleanly and restore public availability.
              </p>
              <div className="mt-4 rounded border border-line/60 bg-canvas/60 p-2.5 font-mono text-[11px] text-ink-subtle">
                HOLD_STATUS: PENDING_PAYMENT | TTL: 900s
              </div>
            </div>

            <div className="card relative overflow-hidden p-6 border-line hover:border-accent/50">
              <div className="font-mono text-xs font-semibold text-accent">[03 / DEPLOY]</div>
              <h3 className="mt-3 text-lg font-semibold text-ink font-sans">
                Arrival Access &amp; Clear Gate Pass
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-muted">
                Receive instant confirmation with a unique reference code, exact entry bay notes, and full pre-arrival cancellation flexibility.
              </p>
              <div className="mt-4 rounded border border-line/60 bg-canvas/60 p-2.5 font-mono text-[11px] text-ink-subtle">
                POLICY: 100% REFUND &gt;= 2H BEFORE ARRIVAL
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Space Owner Callout Banner */}
      <section className="relative z-10 border-t border-line/80 bg-canvas py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="card relative overflow-hidden border-accent/30 bg-gradient-to-r from-canvas-panel via-surface to-canvas-card p-8 sm:p-12">
            <div className="max-w-2xl">
              <div className="font-mono text-xs font-semibold uppercase tracking-wider text-accent">
                MONETIZE INVENTORY &middot; ZERO OVERBOOKING
              </div>
              <h2 className="mt-2 text-2xl font-bold tracking-tight text-ink sm:text-3xl font-sans">
                Manage commercial or residential bays on ParkPilot
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-ink-muted">
                Publish basement slots, gated residential driveways, or multi-spot commercial open lots. Set your own hourly tariff, daily operating hours, and monitor live bookings.
              </p>

              <div className="mt-6 flex flex-wrap gap-4 font-mono text-xs text-ink-subtle">
                <span className="flex items-center gap-1.5 text-emerald-400">
                  <ShieldCheck className="h-4 w-4" /> Automated overlap defense
                </span>
                <span className="flex items-center gap-1.5 text-accent">
                  <Database className="h-4 w-4" /> Instant pause / activate controls
                </span>
              </div>

              <div className="mt-8 flex flex-wrap gap-4">
                <Link
                  to={user && (user.role === "OWNER" || user.role === "ADMIN") ? "/owner" : "/list-your-space"}
                  className="btn-primary"
                >
                  <span>{user && (user.role === "OWNER" || user.role === "ADMIN") ? "LAUNCH OWNER CONSOLE" : "REGISTER YOUR SPACE"}</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link to="/search" className="btn-secondary">
                  EXPLORE LIVE NETWORK
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
