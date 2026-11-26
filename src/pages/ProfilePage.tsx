import React, { useState } from "react";
import { CheckCircle2, Cpu, Phone, User as UserIcon } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export function ProfilePage() {
  const { user, updateProfile } = useAuth();

  const [name, setName] = useState(user?.name || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!user) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    setError(null);

    try {
      await updateProfile({ name, phone: phone.trim() || undefined });
      setSaved(true);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Profile update failed."
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6 font-mono text-xs">
      <div className="card border-line-strong bg-canvas-panel/95 p-6 shadow-terminal sm:p-8">
        <div className="flex items-center justify-between border-b border-line pb-4">
          <div>
            <div className="flex items-center gap-2 text-accent">
              <Cpu className="h-4 w-4" />
              <span className="font-semibold uppercase tracking-wider">IDENTITY TELEMETRY</span>
            </div>
            <h1 className="mt-1 text-xl font-bold tracking-tight text-ink font-sans">
              User Profile &amp; Clearance
            </h1>
            <p className="mt-0.5 text-ink-muted">{user.email}</p>
          </div>
          <span className="telemetry-pill bg-canvas text-accent border-accent/40 font-bold">
            {user.role}
          </span>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label
              htmlFor="profile-name"
              className="mb-1.5 flex items-center gap-1.5 font-medium text-ink-muted"
            >
              <UserIcon className="h-3 w-3 text-accent" />
              <span>DISPLAY IDENTITY (NAME)</span>
            </label>
            <input
              id="profile-name"
              type="text"
              required
              minLength={2}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input-field"
            />
          </div>

          <div>
            <label
              htmlFor="profile-phone"
              className="mb-1.5 flex items-center gap-1.5 font-medium text-ink-muted"
            >
              <Phone className="h-3 w-3 text-accent" />
              <span>REGISTERED TELEPHONE</span>
            </label>
            <input
              id="profile-phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+91 98765 43210"
              className="input-field"
            />
          </div>

          {saved && (
            <div className="flex items-center gap-2 rounded border border-emerald-500/40 bg-emerald-950/40 p-3 text-emerald-300">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              <span>[+] PROFILE ATTRIBUTES SYNCHRONIZED</span>
            </div>
          )}

          {error && (
            <div className="rounded border border-red-500/40 bg-red-950/40 p-3 text-red-300">
              [!] {error}
            </div>
          )}

          <button type="submit" disabled={saving} className="btn-primary py-2.5 px-4">
            {saving ? "COMMITTING..." : "SAVE PROFILE REVISIONS"}
          </button>
        </form>
      </div>
    </div>
  );
}
