import React, { useCallback, useEffect, useState } from "react";
import {
  Cpu,
  Edit2,
  PauseCircle,
  PlayCircle,
  Plus,
  RefreshCw,
  Trash2,
  X,
} from "lucide-react";
import { apiRequest } from "../lib/api";
import {
  formatInrFromPaise,
  formatLocalDateTime,
  formatOperatingHours,
  parkingTypeLabel,
} from "../lib/format";
import {
  BookingStatusBadge,
  PaymentStatusBadge,
} from "../components/StatusBadge";
import { ConfirmDialog } from "../components/ConfirmDialog";
import type { BookingRecord, ParkingListing, ParkingType } from "../types";

interface ListingFormState {
  title: string;
  description: string;
  addressLine: string;
  area: string;
  city: string;
  postalCode: string;
  parkingType: ParkingType;
  vehicleCompatibility: string;
  instructions: string;
  pricePerHourInr: string;
  availableFromHour: number;
  availableToHour: number;
}

const emptyForm: ListingFormState = {
  title: "",
  description: "",
  addressLine: "",
  area: "",
  city: "",
  postalCode: "",
  parkingType: "COVERED",
  vehicleCompatibility: "",
  instructions: "",
  pricePerHourInr: "80",
  availableFromHour: 0,
  availableToHour: 24,
};

export function OwnerDashboardPage() {
  const [tab, setTab] = useState<"listings" | "bookings">("listings");
  const [listings, setListings] = useState<ParkingListing[]>([]);
  const [bookings, setBookings] = useState<BookingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ListingFormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<ParkingListing | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [lData, bData] = await Promise.all([
        apiRequest<{ listings: ParkingListing[] }>("/api/owner/listings"),
        apiRequest<{ bookings: BookingRecord[] }>("/api/owner/bookings"),
      ]);
      setListings(lData.listings);
      setBookings(bData.bookings);
      setError(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load owner dashboard."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
    const timer = window.setInterval(() => void loadData(), 12000);
    return () => window.clearInterval(timer);
  }, [loadData]);

  const openCreateModal = () => {
    setEditingId(null);
    setForm(emptyForm);
    setFormError(null);
    setFormOpen(true);
  };

  const openEditModal = (listing: ParkingListing) => {
    setEditingId(listing.id);
    setForm({
      title: listing.title,
      description: listing.description,
      addressLine: listing.addressLine,
      area: listing.area,
      city: listing.city,
      postalCode: listing.postalCode || "",
      parkingType: listing.parkingType,
      vehicleCompatibility: listing.vehicleCompatibility || "",
      instructions: listing.instructions || "",
      pricePerHourInr: String(listing.pricePerHourPaise / 100),
      availableFromHour: listing.availableFromHour,
      availableToHour: listing.availableToHour,
    });
    setFormError(null);
    setFormOpen(true);
  };

  const handleSaveListing = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const priceInr = Number(form.pricePerHourInr);
    if (Number.isNaN(priceInr) || priceInr < 10 || priceInr > 5000) {
      setFormError("Hourly price must be between ₹10 and ₹5,000.");
      return;
    }

    if (form.availableToHour <= form.availableFromHour) {
      setFormError("Closing hour must be strictly later than opening hour.");
      return;
    }

    const payload = {
      title: form.title,
      description: form.description,
      addressLine: form.addressLine,
      area: form.area,
      city: form.city,
      postalCode: form.postalCode,
      parkingType: form.parkingType,
      vehicleCompatibility: form.vehicleCompatibility,
      instructions: form.instructions,
      pricePerHourPaise: Math.round(priceInr * 100),
      availableFromHour: Number(form.availableFromHour),
      availableToHour: Number(form.availableToHour),
    };

    setSaving(true);
    try {
      if (editingId) {
        await apiRequest(`/api/owner/listings/${editingId}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
        setNotice("Listing updated in ledger.");
      } else {
        await apiRequest("/api/owner/listings", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        setNotice("New parking slot published to public allocation grid.");
      }
      setFormOpen(false);
      await loadData();
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : "Could not commit listing."
      );
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (listing: ParkingListing) => {
    setError(null);
    setNotice(null);
    try {
      await apiRequest(`/api/owner/listings/${listing.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ isActive: !listing.isActive }),
      });
      setNotice(
        listing.isActive ? `"${listing.title}" paused.` : `"${listing.title}" activated.`
      );
      await loadData();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to toggle status."
      );
    }
  };

  const handleDeleteListing = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setError(null);
    setNotice(null);
    try {
      await apiRequest(`/api/owner/listings/${deleteTarget.id}`, {
        method: "DELETE",
      });
      setNotice(`"${deleteTarget.title}" deleted.`);
      setDeleteTarget(null);
      await loadData();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not delete listing."
      );
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      {/* Console Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line pb-6">
        <div>
          <div className="flex items-center gap-2 font-mono text-xs text-accent uppercase">
            <Cpu className="h-3.5 w-3.5" />
            <span>OPERATOR MANAGEMENT CONSOLE</span>
          </div>
          <h1 className="mt-1.5 text-2xl font-bold tracking-tight text-ink sm:text-3xl font-sans">
            Parking Bay Operations
          </h1>
          <p className="mt-1 text-xs font-mono text-ink-muted">
            Inventory controls, tariff adjustments, and live driver reservations
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => void loadData()}
            className="btn-secondary py-2 px-3 text-xs font-mono"
          >
            <RefreshCw className="h-3.5 w-3.5 text-accent" />
            <span>SYNC</span>
          </button>
          <button type="button" onClick={openCreateModal} className="btn-primary py-2 px-4 text-xs">
            <Plus className="h-4 w-4" />
            <span>DEPLOY NEW BAY</span>
          </button>
        </div>
      </div>

      {notice && (
        <div className="mt-5 rounded-lg border border-emerald-500/40 bg-emerald-950/40 p-3.5 font-mono text-xs text-emerald-300">
          [+] {notice}
        </div>
      )}

      {error && (
        <div className="mt-5 rounded-lg border border-red-500/40 bg-red-950/40 p-3.5 font-mono text-xs text-red-300">
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
          ALLOCATED BAYS ({listings.length})
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
          SESSION LOGS ({bookings.length})
        </button>
      </div>

      {loading ? (
        <div className="card mt-6 p-8 font-mono text-xs text-ink-muted">
          INITIALIZING OPERATOR CONSOLE...
        </div>
      ) : tab === "listings" ? (
        listings.length === 0 ? (
          <div className="card mt-6 p-12 text-center font-mono">
            <p className="text-sm font-semibold text-ink">NO BAYS CURRENTLY REGISTERED</p>
            <p className="mt-1 text-xs text-ink-muted">Deploy a space to begin accepting reservations.</p>
            <button
              type="button"
              onClick={openCreateModal}
              className="btn-primary mt-5"
            >
              <Plus className="h-4 w-4" />
              <span>DEPLOY NEW BAY</span>
            </button>
          </div>
        ) : (
          <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
            {listings.map((item) => (
              <div key={item.id} className="card border-line-strong bg-surface/90 p-6">
                <div className="flex items-start justify-between gap-3 border-b border-line/60 pb-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="telemetry-pill bg-canvas text-accent border-accent/30">
                        {parkingTypeLabel(item.parkingType)}
                      </span>
                      <span
                        className={`telemetry-pill ${
                          item.isActive && item.isApproved
                            ? "border-emerald-500/40 bg-emerald-950/40 text-emerald-400"
                            : "border-slate-600 bg-slate-900 text-slate-400"
                        }`}
                      >
                        {!item.isApproved ? "MODERATED" : item.isActive ? "ONLINE" : "PAUSED"}
                      </span>
                    </div>
                    <h2 className="mt-2 text-base font-bold text-ink font-sans">
                      {item.title}
                    </h2>
                    <p className="mt-1 font-mono text-xs text-ink-muted">
                      {item.addressLine}, {item.area}, {item.city}
                    </p>
                  </div>

                  <div className="text-right shrink-0 font-mono">
                    <div className="text-lg font-bold text-ink">
                      {formatInrFromPaise(item.pricePerHourPaise)}/hr
                    </div>
                    <div className="mt-1 text-[11px] text-ink-subtle">
                      {formatOperatingHours(item.availableFromHour, item.availableToHour)}
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-2 font-mono text-xs">
                  <button
                    type="button"
                    onClick={() => openEditModal(item)}
                    className="btn-secondary py-1.5 px-3 text-xs"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                    <span>MODIFY</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleToggleActive(item)}
                    className="btn-secondary py-1.5 px-3 text-xs"
                  >
                    {item.isActive ? (
                      <>
                        <PauseCircle className="h-3.5 w-3.5" />
                        <span>PAUSE</span>
                      </>
                    ) : (
                      <>
                        <PlayCircle className="h-3.5 w-3.5" />
                        <span>RESUME</span>
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteTarget(item)}
                    className="btn-danger ml-auto py-1.5 px-3 text-xs"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>DECOMMISSION</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      ) : bookings.length === 0 ? (
        <div className="card mt-6 p-12 text-center font-mono">
          <p className="text-sm font-semibold text-ink">NO RESERVATION SESSIONS RECORDED</p>
          <p className="mt-1 text-xs text-ink-muted">Driver reservations will appear in real-time.</p>
        </div>
      ) : (
        <div className="mt-6 space-y-3 font-mono text-xs">
          {bookings.map((b) => (
            <div
              key={b.id}
              className="card flex flex-col justify-between gap-4 p-5 sm:flex-row sm:items-center border-line bg-surface/80"
            >
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-bold text-ink-muted">{b.reference}</span>
                  <BookingStatusBadge status={b.status} />
                  {b.payment && <PaymentStatusBadge status={b.payment.status} />}
                </div>
                <h2 className="mt-2 text-sm font-bold text-ink font-sans">
                  {b.listing.title}
                </h2>
                <p className="mt-1 text-ink-subtle">
                  {formatLocalDateTime(b.startTime)} &rarr; {formatLocalDateTime(b.endTime)}
                </p>
                {b.driver && (
                  <p className="mt-1 text-ink-muted">
                    USER: {b.driver.name} ({b.driver.email}) {b.vehicleNumber ? `| REG: ${b.vehicleNumber}` : ""}
                  </p>
                )}
              </div>

              <div className="text-left sm:text-right">
                <div className="text-base font-bold text-ink">
                  {formatInrFromPaise(b.totalAmountPaise)}
                </div>
                {b.payment?.refundedAmountPaise ? (
                  <div className="text-sky-400 font-semibold">
                    REFUND: {formatInrFromPaise(b.payment.refundedAmountPaise)}
                  </div>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Form */}
      {formOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-canvas/80 p-4 backdrop-blur-md"
          role="dialog"
          aria-modal="true"
        >
          <div className="card my-8 w-full max-w-2xl border-line-strong bg-canvas-panel p-6 shadow-terminal">
            <div className="flex items-center justify-between border-b border-line pb-4 font-mono">
              <h2 className="text-sm font-bold uppercase text-ink">
                {editingId ? "MODIFY BAY PARAMETERS" : "DEPLOY NEW PARKING BAY"}
              </h2>
              <button
                type="button"
                onClick={() => setFormOpen(false)}
                className="text-ink-muted hover:text-ink"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveListing} className="mt-5 space-y-4 font-mono text-xs">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-ink-muted">BAY TITLE</label>
                  <input
                    type="text"
                    required
                    minLength={4}
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    placeholder="e.g. Indiranagar 100ft Rd Basement Bay"
                    className="input-field"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="mb-1 block text-ink-muted">DESCRIPTION</label>
                  <textarea
                    rows={3}
                    required
                    minLength={10}
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder="Describe gate access, security camera, surface type..."
                    className="input-field"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="mb-1 block text-ink-muted">STREET ADDRESS</label>
                  <input
                    type="text"
                    required
                    minLength={4}
                    value={form.addressLine}
                    onChange={(e) => setForm({ ...form, addressLine: e.target.value })}
                    placeholder="Exact address line"
                    className="input-field"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-ink-muted">AREA / ZONE</label>
                  <input
                    type="text"
                    required
                    value={form.area}
                    onChange={(e) => setForm({ ...form, area: e.target.value })}
                    placeholder="Indiranagar"
                    className="input-field"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-ink-muted">CITY</label>
                  <input
                    type="text"
                    required
                    value={form.city}
                    onChange={(e) => setForm({ ...form, city: e.target.value })}
                    placeholder="Bengaluru"
                    className="input-field"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-ink-muted">POSTAL CODE</label>
                  <input
                    type="text"
                    value={form.postalCode}
                    onChange={(e) => setForm({ ...form, postalCode: e.target.value })}
                    placeholder="560038"
                    className="input-field"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-ink-muted">BAY CLASSIFICATION</label>
                  <select
                    value={form.parkingType}
                    onChange={(e) => setForm({ ...form, parkingType: e.target.value as ParkingType })}
                    className="input-field"
                  >
                    <option value="COVERED">Covered</option>
                    <option value="OPEN_LOT">Open Lot</option>
                    <option value="GARAGE">Private Garage</option>
                    <option value="DRIVEWAY">Driveway</option>
                    <option value="VALET">Valet</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-ink-muted">HOURLY TARIFF (INR ₹)</label>
                  <input
                    type="number"
                    required
                    min="10"
                    max="5000"
                    step="1"
                    value={form.pricePerHourInr}
                    onChange={(e) => setForm({ ...form, pricePerHourInr: e.target.value })}
                    className="input-field"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="mb-1 block text-ink-muted">OPEN (IST)</label>
                    <select
                      value={form.availableFromHour}
                      onChange={(e) => setForm({ ...form, availableFromHour: Number(e.target.value) })}
                      className="input-field"
                    >
                      {Array.from({ length: 24 }, (_, h) => (
                        <option key={h} value={h}>{String(h).padStart(2, "0")}:00</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-ink-muted">CLOSE (IST)</label>
                    <select
                      value={form.availableToHour}
                      onChange={(e) => setForm({ ...form, availableToHour: Number(e.target.value) })}
                      className="input-field"
                    >
                      {Array.from({ length: 24 }, (_, idx) => idx + 1).map((h) => (
                        <option key={h} value={h}>{String(h).padStart(2, "0")}:00</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label className="mb-1 block text-ink-muted">VEHICLE COMPATIBILITY</label>
                  <input
                    type="text"
                    value={form.vehicleCompatibility}
                    onChange={(e) => setForm({ ...form, vehicleCompatibility: e.target.value })}
                    placeholder="e.g. Sedans and compact SUVs"
                    className="input-field"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="mb-1 block text-ink-muted">HOST ENTRY DIRECTIVES</label>
                  <textarea
                    rows={2}
                    value={form.instructions}
                    onChange={(e) => setForm({ ...form, instructions: e.target.value })}
                    placeholder="Gate code, bay marker B-04..."
                    className="input-field"
                  />
                </div>
              </div>

              {formError && (
                <div className="rounded border border-red-500/40 bg-red-950/40 p-3 text-red-300">
                  [!] {formError}
                </div>
              )}

              <div className="flex justify-end gap-3 border-t border-line/60 pt-4">
                <button
                  type="button"
                  onClick={() => setFormOpen(false)}
                  className="btn-secondary"
                >
                  ABORT
                </button>
                <button type="submit" disabled={saving} className="btn-primary">
                  {saving ? "COMMITTING..." : editingId ? "SAVE REVISIONS" : "PUBLISH TO GRID"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="DECOMMISSION PARKING BAY?"
        description={
          deleteTarget
            ? `Permanently decommission "${deleteTarget.title}"? Bays with active or pending bookings cannot be decommissioned.`
            : ""
        }
        confirmLabel="YES, DECOMMISSION"
        busy={deleting}
        onConfirm={() => void handleDeleteListing()}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  );
}
