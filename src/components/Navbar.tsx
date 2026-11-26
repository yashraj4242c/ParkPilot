import { useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import {
  Activity,
  Cpu,
  Layers,
  LogOut,
  Menu,
  Shield,
  User as UserIcon,
  X,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";

export function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    setMobileOpen(false);
    navigate("/");
  };

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `inline-flex items-center gap-1.5 text-xs font-mono font-medium tracking-wider uppercase transition-colors py-1.5 px-2.5 rounded-md ${
      isActive
        ? "text-accent bg-accent-soft border border-accent/30"
        : "text-ink-muted hover:text-ink hover:bg-surface/50"
    }`;

  return (
    <header className="sticky top-0 z-40 border-b border-line/80 bg-canvas/90 backdrop-blur-md">
      {/* Top telemetry ticker strip */}
      <div className="border-b border-line/40 bg-canvas-subtle/90 px-4 py-1 text-[11px] font-mono text-ink-subtle">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 text-emerald-400">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
              </span>
              SYSTEM ONLINE
            </span>
            <span className="hidden text-ink-faint sm:inline">&middot;</span>
            <span className="hidden sm:inline">PRECISION LOCK ACTIVE</span>
            <span className="hidden text-ink-faint sm:inline">&middot;</span>
            <span className="hidden font-mono sm:inline">LATENCY: &lt;14ms</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-ink-subtle">CURRENCY: INR (PAISE-LOCKED)</span>
            <span className="text-ink-faint">&middot;</span>
            <span className="text-accent">V2.4 CORE</span>
          </div>
        </div>
      </div>

      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        {/* Brand identity */}
        <Link
          to="/"
          className="flex items-center gap-3 group"
          onClick={() => setMobileOpen(false)}
        >
          <div className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-accent/40 bg-accent-soft text-accent shadow-glow transition-transform group-hover:scale-105">
            <Cpu className="h-5 w-5" />
            <div className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-accent animate-pulse" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="text-base font-bold tracking-tight text-ink font-mono">
                PARK<span className="text-accent">PILOT</span>
              </span>
              <span className="rounded border border-accent/30 bg-accent/10 px-1 py-0.2 text-[9px] font-mono uppercase text-accent font-semibold">
                OS
              </span>
            </div>
            <span className="text-[10px] font-mono tracking-wider text-ink-subtle uppercase">
              Smart Slot Control
            </span>
          </div>
        </Link>

        {/* Center navigation */}
        <nav className="hidden items-center gap-1 md:flex">
          <NavLink to="/search" className={navLinkClass}>
            <Activity className="h-3.5 w-3.5" />
            Terminal Search
          </NavLink>
          {(!user || user.role === "DRIVER") && (
            <NavLink to="/list-your-space" className={navLinkClass}>
              <Layers className="h-3.5 w-3.5" />
              List Space
            </NavLink>
          )}
          {user && (
            <NavLink to="/bookings" className={navLinkClass}>
              Bookings
            </NavLink>
          )}
          {user && (user.role === "OWNER" || user.role === "ADMIN") && (
            <NavLink to="/owner" className={navLinkClass}>
              Owner Console
            </NavLink>
          )}
          {user && user.role === "ADMIN" && (
            <NavLink to="/admin" className={navLinkClass}>
              <Shield className="h-3.5 w-3.5 text-accent" />
              Superadmin
            </NavLink>
          )}
        </nav>

        {/* Right side auth status */}
        <div className="hidden items-center gap-3 md:flex">
          {user ? (
            <div className="flex items-center gap-3">
              <Link
                to="/profile"
                className="flex items-center gap-2 rounded-lg border border-line bg-canvas-card px-3 py-1.5 text-xs font-mono font-medium text-ink transition-colors hover:border-accent/40"
              >
                <div className="h-2 w-2 rounded-full bg-emerald-400" />
                <UserIcon className="h-3.5 w-3.5 text-ink-muted" />
                <span>{user.name.split(" ")[0]}</span>
                <span className="rounded bg-surface px-1.5 py-0.5 text-[10px] text-accent uppercase">
                  {user.role}
                </span>
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                className="flex items-center gap-1 text-xs font-mono text-ink-subtle transition-colors hover:text-red-400"
                title="Disconnect Session"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span>EXIT</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                to="/login"
                className="px-3 py-1.5 text-xs font-mono font-medium uppercase tracking-wider text-ink-muted transition-colors hover:text-ink"
              >
                Sign In
              </Link>
              <Link to="/signup" className="btn-primary py-2 px-3 text-xs">
                Create Account
              </Link>
            </div>
          )}
        </div>

        {/* Mobile menu trigger */}
        <button
          type="button"
          className="inline-flex items-center justify-center rounded-lg border border-line p-2 text-ink-muted md:hidden hover:bg-surface"
          onClick={() => setMobileOpen((prev) => !prev)}
          aria-label="Toggle navigation menu"
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="border-t border-line bg-canvas-panel/95 px-4 py-4 md:hidden backdrop-blur-lg">
          <div className="flex flex-col gap-2 font-mono text-xs">
            <Link
              to="/search"
              className="py-2 text-ink hover:text-accent"
              onClick={() => setMobileOpen(false)}
            >
              [+] Terminal Search
            </Link>
            {(!user || user.role === "DRIVER") && (
              <Link
                to="/list-your-space"
                className="py-2 text-ink hover:text-accent"
                onClick={() => setMobileOpen(false)}
              >
                [+] List Space
              </Link>
            )}
            {user && (
              <Link
                to="/bookings"
                className="py-2 text-ink hover:text-accent"
                onClick={() => setMobileOpen(false)}
              >
                [+] My Bookings
              </Link>
            )}
            {user && (user.role === "OWNER" || user.role === "ADMIN") && (
              <Link
                to="/owner"
                className="py-2 text-ink hover:text-accent"
                onClick={() => setMobileOpen(false)}
              >
                [+] Owner Console
              </Link>
            )}
            {user && user.role === "ADMIN" && (
              <Link
                to="/admin"
                className="py-2 text-accent"
                onClick={() => setMobileOpen(false)}
              >
                [+] Superadmin Console
              </Link>
            )}

            <div className="mt-3 border-t border-line pt-3">
              {user ? (
                <div className="flex items-center justify-between">
                  <Link
                    to="/profile"
                    className="text-xs text-ink-muted"
                    onClick={() => setMobileOpen(false)}
                  >
                    User: {user.name} ({user.role})
                  </Link>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="text-xs text-red-400"
                  >
                    Disconnect
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Link
                    to="/login"
                    className="btn-secondary flex-1 py-2 text-center"
                    onClick={() => setMobileOpen(false)}
                  >
                    Login
                  </Link>
                  <Link
                    to="/signup"
                    className="btn-primary flex-1 py-2 text-center"
                    onClick={() => setMobileOpen(false)}
                  >
                    Sign Up
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
