import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import type { UserRole } from "../types";

export function ProtectedRoute({
  children,
  roles,
}: {
  children: React.ReactNode;
  roles?: UserRole[];
}) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="card p-8 text-center text-sm text-ink-muted">
          Verifying session...
        </div>
      </div>
    );
  }

  if (!user) {
    const next = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/login?redirect=${next}`} replace />;
  }

  if (roles && !roles.includes(user.role)) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
        <div className="card p-8">
          <h1 className="text-lg font-semibold text-ink">Access restricted</h1>
          <p className="mt-2 text-sm text-ink-muted">
            Your account ({user.role.toLowerCase()}) does not have permission to
            view this page.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
