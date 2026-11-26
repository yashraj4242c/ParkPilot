import { Link } from "react-router-dom";
import { ArrowRight, Cpu, Database, Lock, Sliders } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export function ListYourSpacePage() {
  const { user } = useAuth();

  return (
    <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 font-mono text-xs">
      <div className="card border-line-strong bg-canvas-panel/95 p-8 shadow-terminal sm:p-12">
        <div className="flex items-center gap-2 text-accent uppercase font-bold tracking-wider">
          <Cpu className="h-4 w-4" />
          <span>INVENTORY DEPLOYMENT &middot; OPERATOR NETWORK</span>
        </div>
        <h1 className="mt-3 text-2xl font-extrabold tracking-tight text-ink sm:text-4xl font-sans">
          Monetize Parking Assets with Guaranteed Overlap Defense
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-ink-muted">
          Connect your private driveway, residential basement slot, or multi-spot commercial lot to the ParkPilot grid. Every booking locks exclusively at the PostgreSQL engine level.
        </p>

        <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-3">
          <div className="rounded-xl border border-line bg-canvas/70 p-5">
            <Sliders className="h-5 w-5 text-accent" />
            <h2 className="mt-3 text-sm font-bold text-ink uppercase">
              Schedule Autonomy
            </h2>
            <p className="mt-1.5 text-xs leading-relaxed text-ink-muted">
              Configure tariff in INR, set daily operational windows (00:00 to 24:00 IST), and toggle pause status anytime.
            </p>
          </div>
          <div className="rounded-xl border border-line bg-canvas/70 p-5">
            <Lock className="h-5 w-5 text-accent" />
            <h2 className="mt-3 text-sm font-bold text-ink uppercase">
              Hardware-Grade Locking
            </h2>
            <p className="mt-1.5 text-xs leading-relaxed text-ink-muted">
              PostgreSQL <code className="text-accent">btree_gist</code> exclusion constraints ensure zero double-booking even under concurrent race conditions.
            </p>
          </div>
          <div className="rounded-xl border border-line bg-canvas/70 p-5">
            <Database className="h-5 w-5 text-accent" />
            <h2 className="mt-3 text-sm font-bold text-ink uppercase">
              Live Session Telemetry
            </h2>
            <p className="mt-1.5 text-xs leading-relaxed text-ink-muted">
              Monitor active driver sessions, arrival notifications, vehicle plate numbers, and settlement amounts in real-time.
            </p>
          </div>
        </div>

        <div className="mt-10 flex flex-wrap items-center gap-4 border-t border-line/60 pt-6">
          {user && (user.role === "OWNER" || user.role === "ADMIN") ? (
            <Link to="/owner" className="btn-primary py-3 px-5">
              <span>LAUNCH OPERATOR CONSOLE</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          ) : (
            <>
              <Link to="/signup?role=OWNER" className="btn-primary py-3 px-5">
                <span>INITIALIZE OPERATOR ACCOUNT</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
              {!user && (
                <Link to="/login" className="btn-secondary py-3 px-5">
                  AUTHENTICATE EXISTING ACCOUNT
                </Link>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
