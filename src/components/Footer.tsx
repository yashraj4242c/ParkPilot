import { Link } from "react-router-dom";
import { Cpu } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-line/80 bg-canvas-subtle/90 font-mono text-xs">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <div className="flex flex-col justify-between gap-8 sm:flex-row sm:items-start">
          <div className="max-w-sm">
            <Link to="/" className="flex items-center gap-2.5 text-ink group">
              <div className="flex h-7 w-7 items-center justify-center rounded-md border border-accent/40 bg-accent/10 text-accent">
                <Cpu className="h-4 w-4" />
              </div>
              <span className="font-mono text-sm font-bold tracking-tight text-ink">
                PARK<span className="text-accent">PILOT</span>
              </span>
            </Link>
            <p className="mt-3 text-xs leading-relaxed text-ink-muted">
              Autonomous parking marketplace &amp; bay allocation terminal. Enforcing strict database-level zero-overlap exclusion constraints across all reservations.
            </p>
          </div>

          <div className="flex flex-wrap gap-8 text-xs font-mono">
            <div>
              <div className="font-semibold uppercase tracking-wider text-accent mb-2">GRID NAVIGATION</div>
              <ul className="space-y-1.5 text-ink-muted">
                <li><Link to="/search" className="hover:text-ink">TERMINAL SEARCH</Link></li>
                <li><Link to="/list-your-space" className="hover:text-ink">REGISTER BAY</Link></li>
                <li><Link to="/bookings" className="hover:text-ink">DISPATCH LEDGER</Link></li>
              </ul>
            </div>

            <div>
              <div className="font-semibold uppercase tracking-wider text-accent mb-2">INTEGRITY &amp; PROTOCOL</div>
              <ul className="space-y-1.5 text-ink-muted">
                <li><Link to="/policy" className="hover:text-ink">CANCELLATION RULES</Link></li>
                <li><Link to="/login" className="hover:text-ink">USER AUTHENTICATION</Link></li>
                <li><span className="text-ink-subtle">TIMEZONE: IST [UTC+05:30]</span></li>
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-10 flex flex-col justify-between gap-4 border-t border-line/50 pt-6 text-[11px] text-ink-subtle sm:flex-row sm:items-center">
          <div>
            PARKPILOT PLATFORM &middot; HIGH-CONCURRENCY EXCLUSION CONSTRAINT ACTIVE
          </div>
          <div className="flex items-center gap-2 text-emerald-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>ALL SYSTEMS OPERATIONAL</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
