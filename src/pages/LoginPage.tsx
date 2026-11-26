import React, { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Cpu, KeyRound, Lock, Mail } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const redirect = searchParams.get("redirect");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const user = await login(email, password);
      if (redirect && redirect.startsWith("/")) {
        navigate(redirect, { replace: true });
      } else if (user.role === "OWNER") {
        navigate("/owner", { replace: true });
      } else if (user.role === "ADMIN") {
        navigate("/admin", { replace: true });
      } else {
        navigate("/search", { replace: true });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication denied.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-md px-4 py-16 sm:px-6 font-mono text-xs">
      <div className="card border-line-strong bg-canvas-panel/95 p-6 shadow-terminal sm:p-8">
        <div className="flex items-center gap-2 text-accent">
          <Cpu className="h-4 w-4" />
          <span className="font-semibold uppercase tracking-wider">SESSION ACCESS GATEWAY</span>
        </div>
        <h1 className="mt-2 text-xl font-bold tracking-tight text-ink font-sans">
          Sign In to ParkPilot
        </h1>
        <p className="mt-1 text-ink-muted">
          Provide credentials to access reservations, bay allocation controls, and profile data.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label
              htmlFor="login-email"
              className="mb-1.5 flex items-center gap-1.5 font-medium text-ink-muted"
            >
              <Mail className="h-3 w-3 text-accent" />
              <span>USER IDENTITY (EMAIL)</span>
            </label>
            <input
              id="login-email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="operator@parkpilot.local"
              className="input-field"
            />
          </div>

          <div>
            <label
              htmlFor="login-password"
              className="mb-1.5 flex items-center gap-1.5 font-medium text-ink-muted"
            >
              <KeyRound className="h-3 w-3 text-accent" />
              <span>SECURITY PASSPHRASE</span>
            </label>
            <input
              id="login-password"
              type="password"
              required
              autoComplete="current-password"
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
            <span>{submitting ? "VERIFYING IDENTITY..." : "AUTHORIZE SESSION"}</span>
          </button>
        </form>

        <div className="mt-6 border-t border-line/60 pt-4 text-center text-ink-muted">
          New terminal user?{" "}
          <Link
            to={
              redirect
                ? `/signup?redirect=${encodeURIComponent(redirect)}`
                : "/signup"
            }
            className="text-accent hover:underline font-semibold"
          >
            Create account
          </Link>
        </div>
      </div>
    </div>
  );
}
