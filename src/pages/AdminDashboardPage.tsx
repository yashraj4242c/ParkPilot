import { useCallback, useEffect, useState } from "react";
import { RefreshCw, Shield } from "lucide-react";
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
import type { BookingRecord, ParkingListing, User } from "../types";

interface AdminUserRow extends User {
  _count: { listings: number; bookings: number };
}

interface AdminListingRow extends ParkingListing {
  owner: { id: string; name: string; email: string };
}

export function AdminDashboardPage() {
  const [tab, setTab] = useState<"listings" | "bookings" | "users">("listings");
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [listings, setListings] = useState<AdminListingRow[]>([]);
  const [bookings, setBookings] = useState<BookingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const loadOverview = useCallback(async () => {
    try {
      const data = await apiRequest<{
        users: AdminUserRow[];
        listings: AdminListingRow[];
        bookings: BookingRecord[];
      }>("/api/admin/overview");
      setUsers(data.users);
      setListings(data.listings);
      setBookings(data.bookings);
      setError(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load admin overview."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadOverview();
  }, [loadOverview]);

  const toggleUserActive = async (u: AdminUserRow) => {
    setError(null);
    setNotice(null);
    try {
      await apiRequest(`/api/admin/users/${u.id}`, {
        method: "PATCH",
        body: JSON.stringify({ isActive: !u.isActive }),
      });
      setNotice(
        u.isActive ? `Suspended session for ${u.email}.` : `Reactivated ${u.email}.`
      );
      await loadOverview();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update user.");
    }
  };

  const toggleListingModeration = async (
    listing: AdminListingRow,
    patch: { isApproved?: boolean; isActive?: boolean }
  ) => {
    setError(null);
    setNotice(null);
    try {
      await apiRequest(`/api/admin/listings/${listing.id}/moderation`, {
        method: "PATCH",
        body: JSON.stringify(patch),
      });
      setNotice(`Updated moderation state for node "${listing.title}".`);
      await loadOverview();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to moderate listing."
      );
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 font-mono text-xs">
      {/* Admin header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs text-accent uppercase">
            <Shield className="h-4 w-4" />
            <span>PLATFORM SUPERADMIN TERMINAL</span>
          </div>
          <h1 className="mt-1.5 text-2xl font-bold tracking-tight text-ink sm:text-3xl font-sans">
            System Overseer Console
          </h1>
          <p className="mt-1 text-ink-muted">
            Platform-wide governance: listing moderation, financial records, and account permissions
          </p>
        </div>

        <button
          type="button"
          onClick={() => void loadOverview()}
          className="btn-secondary py-2 px-3 text-xs"
        >
          <RefreshCw className="h-3.5 w-3.5 text-accent" />
          <span>SYNC TELEMETRY</span>
        </button>
      </div>

      {notice && (
        <div className="mt-5 rounded border border-emerald-500/40 bg-emerald-950/40 p-3.5 text-emerald-300">
          [+] {notice}
        </div>
      )}

      {error && (
        <div className="mt-5 rounded border border-red-500/40 bg-red-950/40 p-3.5 text-red-300">
          [!] {error}
        </div>
      )}

      {/* Tabs */}
      <div className="mt-6 flex gap-2 border-b border-line font-mono text-xs">
        <button
          type="button"
          onClick={() => setTab("listings")}
          className={`border-b-2 px-4 py-3 font-semibold uppercase tracking-wider transition-colors ${
            tab === "listings"
              ? "border-accent text-accent bg-accent-soft/30"
              : "border-transparent text-ink-muted hover:text-ink"
          }`}
        >
          GLOBAL BAYS ({listings.length})
        </button>
        <button
          type="button"
          onClick={() => setTab("bookings")}
          className={`border-b-2 px-4 py-3 font-semibold uppercase tracking-wider transition-colors ${
            tab === "bookings"
              ? "border-accent text-accent bg-accent-soft/30"
              : "border-transparent text-ink-muted hover:text-ink"
          }`}
        >
          PLATFORM BOOKINGS ({bookings.length})
        </button>
        <button
          type="button"
          onClick={() => setTab("users")}
          className={`border-b-2 px-4 py-3 font-semibold uppercase tracking-wider transition-colors ${
            tab === "users"
              ? "border-accent text-accent bg-accent-soft/30"
              : "border-transparent text-ink-muted hover:text-ink"
          }`}
        >
          USER IDENTITIES ({users.length})
        </button>
      </div>

      {loading ? (
        <div className="card mt-6 p-8 text-ink-muted">
          SYNCHRONIZING PLATFORM DATABASE LEDGERS...
        </div>
      ) : tab === "listings" ? (
        <div className="mt-6 space-y-3">
          {listings.map((item) => (
            <div
              key={item.id}
              className="card flex flex-col justify-between gap-4 p-5 sm:flex-row sm:items-center border-line-strong bg-surface/90"
            >
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="telemetry-pill bg-canvas text-accent border-accent/30">
                    {parkingTypeLabel(item.parkingType)}
                  </span>
                  <span
                    className={`telemetry-pill ${
                      item.isApproved
                        ? "border-emerald-500/40 bg-emerald-950/40 text-emerald-400"
                        : "border-red-500/40 bg-red-950/40 text-red-400"
                    }`}
                  >
                    {item.isApproved ? "APPROVED" : "SUSPENDED"}
                  </span>
                  {!item.isActive && (
                    <span className="telemetry-pill border-slate-600 bg-slate-900 text-slate-400">
                      OWNER PAUSED
                    </span>
                  )}
                </div>
                <h2 className="mt-2 text-base font-bold text-ink font-sans">
                  {item.title}
                </h2>
                <p className="mt-1 text-ink-muted">
                  {item.area}, {item.city} &middot; {formatInrFromPaise(item.pricePerHourPaise)}/hr &middot; HOST: {item.owner.name} ({item.owner.email})
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() =>
                    void toggleListingModeration(item, {
                      isApproved: !item.isApproved,
                    })
                  }
                  className={
                    item.isApproved
                      ? "btn-danger py-1.5 px-3 text-xs"
                      : "btn-primary py-1.5 px-3 text-xs"
                  }
                >
                  {item.isApproved ? "SUSPEND NODE" : "APPROVE NODE"}
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : tab === "bookings" ? (
        bookings.length === 0 ? (
          <div className="card mt-6 p-10 text-center text-ink-muted">
            NO RESERVATION RECORDS FOUND IN LEDGER
          </div>
        ) : (
          <div className="mt-6 space-y-3">
            {bookings.map((b) => (
              <div
                key={b.id}
                className="card flex flex-col justify-between gap-4 p-5 sm:flex-row sm:items-center border-line bg-surface/80"
              >
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold text-ink-muted">{b.reference}</span>
                    <BookingStatusBadge status={b.status} />
                    {b.payment && (
                      <PaymentStatusBadge status={b.payment.status} />
                    )}
                  </div>
                  <h2 className="mt-1.5 text-sm font-bold text-ink font-sans">
                    {b.listing.title} ({b.listing.city})
                  </h2>
                  <p className="mt-1 text-ink-subtle">
                    {formatLocalDateTime(b.startTime)} &rarr; {formatLocalDateTime(b.endTime)}
                  </p>
                  {b.driver && (
                    <p className="mt-1 text-ink-muted">
                      USER: {b.driver.name} ({b.driver.email})
                    </p>
                  )}
                </div>

                <div className="text-left sm:text-right">
                  <div className="text-base font-bold text-ink font-sans">
                    {formatInrFromPaise(b.totalAmountPaise)}
                  </div>
                  <div className="text-[11px] text-ink-subtle">
                    GATEWAY: {b.payment?.provider === "DEV_TEST" ? "DEV TEST MODE" : "STRIPE"}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        <div className="mt-6 space-y-3">
          {users.map((u) => (
            <div
              key={u.id}
              className="card flex flex-col justify-between gap-4 p-5 sm:flex-row sm:items-center border-line bg-surface/80"
            >
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-bold text-ink font-sans">
                    {u.name}
                  </span>
                  <span className="telemetry-pill bg-canvas text-accent border-accent/30">
                    {u.role}
                  </span>
                  <span
                    className={`telemetry-pill ${
                      u.isActive
                        ? "border-emerald-500/40 bg-emerald-950/40 text-emerald-400"
                        : "border-red-500/40 bg-red-950/40 text-red-400"
                    }`}
                  >
                    {u.isActive ? "ACTIVE" : "DEACTIVATED"}
                  </span>
                </div>
                <p className="mt-1.5 text-ink-muted">
                  EMAIL: {u.email} &middot; BAYS: {u._count.listings} &middot; SESSIONS: {u._count.bookings}
                </p>
              </div>

              <button
                type="button"
                onClick={() => void toggleUserActive(u)}
                className={
                  u.isActive
                    ? "btn-danger py-1.5 px-3 text-xs"
                    : "btn-secondary py-1.5 px-3 text-xs"
                }
              >
                {u.isActive ? "DEACTIVATE ACCESS" : "RESTORE ACCESS"}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
