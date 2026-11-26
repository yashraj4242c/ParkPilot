import { Link } from "react-router-dom";
import { ArrowLeft, Clock, Lock, ShieldCheck, Zap } from "lucide-react";

export function PolicyPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 font-mono text-xs">
      <Link
        to="/search"
        className="inline-flex items-center gap-2 text-ink-muted hover:text-accent transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        <span>BACK TO SEARCH TERMINAL</span>
      </Link>

      <div className="card mt-5 border-line-strong bg-canvas-panel/95 p-6 shadow-terminal sm:p-10">
        <div className="flex items-center gap-2 text-accent">
          <ShieldCheck className="h-4 w-4" />
          <span className="font-semibold uppercase tracking-wider">PROTOCOL SPECIFICATION</span>
        </div>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-ink sm:text-3xl font-sans">
          Booking &amp; Cancellation Policy Engine
        </h1>
        <p className="mt-2 text-ink-muted leading-relaxed">
          Standardized operational rules governing slot reservation holds, database lockouts, and automated refund schedules.
        </p>

        <div className="mt-8 space-y-6">
          <section className="rounded-xl border border-line bg-canvas/60 p-5">
            <div className="flex items-center gap-2 font-bold text-accent uppercase">
              <Clock className="h-4 w-4" />
              <span>1. 15-Minute Reservation Exclusion Hold</span>
            </div>
            <p className="mt-2 text-ink-muted leading-relaxed">
              When a reservation hold is initiated, the requested time range is placed under a 15-minute temporary lock. The slot is completely removed from public search availability. If payment verification does not conclude before the countdown completes, the database automatically releases the hold and updates the status to EXPIRED.
            </p>
          </section>

          <section className="rounded-xl border border-line bg-canvas/60 p-5">
            <div className="flex items-center gap-2 font-bold text-emerald-400 uppercase">
              <Lock className="h-4 w-4" />
              <span>2. Database-Level Overlap Exclusion (Zero Conflict Guarantee)</span>
            </div>
            <p className="mt-2 text-ink-muted leading-relaxed">
              ParkPilot enforces a strict PostgreSQL exclusion constraint (<code className="text-accent">booking_no_overlap_active</code>) using <code className="text-accent">btree_gist</code> on half-open timestamp intervals <code className="text-accent">[startTime, endTime)</code>. Two active reservations cannot occupy the same parking bay for any overlapping minute. Adjacent bookings (where one ends exactly as another begins) are completely valid and supported.
            </p>
          </section>

          <section className="rounded-xl border border-line bg-canvas/60 p-5">
            <div className="flex items-center gap-2 font-bold text-accent-glow uppercase">
              <Zap className="h-4 w-4" />
              <span>3. Automated Cancellation &amp; Refund Schedule</span>
            </div>
            <ul className="mt-3 space-y-2 text-ink-muted">
              <li className="flex items-start gap-2">
                <span className="text-emerald-400 font-bold">&gt;= 2 Hours Before Arrival:</span>
                <span>100% full refund of total amount paid. The bay is immediately restored to the available pool.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-amber-400 font-bold">&lt; 2 Hours Before Arrival:</span>
                <span>50% partial refund of total amount paid. The bay is restored to the public search grid for other drivers.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-400 font-bold">After Scheduled Entry Timestamp:</span>
                <span>0% refund. The space remained reserved exclusively for the driver during the reserved window.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-accent font-bold">Unpaid Reservation Holds:</span>
                <span>Immediate release with zero financial penalty or card hold.</span>
              </li>
            </ul>
          </section>
        </div>

        <div className="mt-8 border-t border-line/60 pt-6">
          <Link to="/search" className="btn-primary py-3 px-5">
            EXPLORE ALLOCATION GRID
          </Link>
        </div>
      </div>
    </div>
  );
}
