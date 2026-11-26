import React, { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Cpu, KeyRound, Lock, Mail, Phone, User as UserIcon } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export function SignupPage() {
  const { signup } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const initialRole =
    searchParams.get("role") === "OWNER" ? "OWNER" : "DRIVER";
  const redirect = searchParams.get("redirect");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"DRIVER" | "OWNER">(initialRole);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const user = await signup({
        name,
        email,
        phone: phone.trim() || undefined,
        password,
        role,
      });

      if (redirect && redirect.startsWith("/")) {
        navigate(redirect, { replace: true });
      } else if (user.role === "OWNER") {
        navigate("/owner", { replace: true });
      } else {
        navigate("/search", { replace: true });
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Registration rejected."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-md px-4 py-16 sm:px-6 font-mono text-xs">
      <div className="card border-line-strong bg-canvas-panel/95 p-6 shadow-terminal sm:p-8">
        <div className="flex items-center gap-2 text-accent">
          <Cpu className="h-4 w-4" />
          <span className="font-semibold uppercase tracking-wider">NEW IDENTITY ONBOARDING</span>
        </div>
        <h1 className="mt-2 text-xl font-bold tracking-tight text-ink font-sans">
          Register on ParkPilot
        </h1>
        <p className="mt-1 text-ink-muted">
          Select role clearance: Driver to book bays or Host to monetize parking assets.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <span className="mb-2 block text-ink-muted font-medium">CLEARANCE ROLE</span>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setRole("DRIVER")}
                className={`rounded border p-2.5 text-left transition-colors ${
                  role === "DRIVER"
                    ? "border-accent bg-accent-soft text-accent font-bold"
                    : "border-line bg-canvas text-ink-muted hover:text-ink"
                }`}
              >
                <div>DRIVER</div>
                <div className="text-[10px] text-ink-subtle font-normal mt-0.5">Search &amp; reserve bays</div>
              </button>
              <button
                type="button"
                onClick={() => setRole("OWNER")}
                className={`rounded border p-2.5 text-left transition-colors ${
                  role === "OWNER"
                    ? "border-accent bg-accent-soft text-accent font-bold"
                    : "border-line bg-canvas text-ink-muted hover:text-ink"
                }`}
              >
                <div>BAY OPERATOR</div>
                <div className="text-[10px] text-ink-subtle font-normal mt-0.5">List &amp; monetize spaces</div>
              </button>
            </div>
          </div>

          <div>
            <label
              htmlFor="signup-name"
              className="mb-1.5 flex items-center gap-1.5 font-medium text-ink-muted"
            >
              <UserIcon className="h-3 w-3 text-accent" />
              <span>FULL NAME / OPERATOR ENTITY</span>
            </label>
            <input
              id="signup-name"
              type="text"
              required
              minLength={2}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Vikram Rao"
              className="input-field"
            />
          </div>

          <div>
            <label
              htmlFor="signup-email"
              className="mb-1.5 flex items-center gap-1.5 font-medium text-ink-muted"
            >
              <Mail className="h-3 w-3 text-accent" />
              <span>EMAIL ADDRESS</span>
            </label>
            <input
              id="signup-email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@example.com"
              className="input-field"
            />
          </div>

          <div>
            <label
              htmlFor="signup-phone"
              className="mb-1.5 flex items-center gap-1.5 font-medium text-ink-muted"
            >
              <Phone className="h-3 w-3 text-accent" />
              <span>CONTACT TELEPHONE (OPTIONAL)</span>
            </label>
            <input
              id="signup-phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+91 98000 00000"
              className="input-field"
            />
          </div>

          <div>
            <label
              htmlFor="signup-password"
              className="mb-1.5 flex items-center gap-1.5 font-medium text-ink-muted"
            >
              <KeyRound className="h-3 w-3 text-accent" />
              <span>PASSPHRASE (&ge; 8 CHARACTERS)</span>
            </label>
            <input
              id="signup-password"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              className="input-field"
            />
          </div>

          {error && (
            <div className="rounded border border-red-500/40 bg-red-950/40 p-3 text-red-300">
              [!] {error}
            </div>
          )}

          <button type="submit" disabled={submitting} className="btn-primary w-full py-3">
            <Lock className="h-3.5 w-3.5" />
            <span>{submitting ? "CREATING CLEARANCE..." : "INITIALIZE ACCOUNT"}</span>
          </button>
        </form>

        <div className="mt-6 border-t border-line/60 pt-4 text-center text-ink-muted">
          Existing clearance?{" "}
          <Link to="/login" className="text-accent hover:underline font-semibold">
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
