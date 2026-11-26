import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { apiRequest } from "../lib/api";
import type { User, UserRole } from "../types";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  signup: (input: {
    email: string;
    password: string;
    name: string;
    phone?: string;
    role: Extract<UserRole, "DRIVER" | "OWNER">;
  }) => Promise<User>;
  logout: () => Promise<void>;
  updateProfile: (input: { name: string; phone?: string }) => Promise<User>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    try {
      const data = await apiRequest<{ user: User }>("/api/auth/me");
      setUser(data.user);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshUser();
  }, [refreshUser]);

  const login = useCallback(async (email: string, password: string) => {
    const data = await apiRequest<{ user: User }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    setUser(data.user);
    return data.user;
  }, []);

  const signup = useCallback(
    async (input: {
      email: string;
      password: string;
      name: string;
      phone?: string;
      role: Extract<UserRole, "DRIVER" | "OWNER">;
    }) => {
      const data = await apiRequest<{ user: User }>("/api/auth/signup", {
        method: "POST",
        body: JSON.stringify(input),
      });
      setUser(data.user);
      return data.user;
    },
    []
  );

  const logout = useCallback(async () => {
    await apiRequest<{ loggedOut: boolean }>("/api/auth/logout", {
      method: "POST",
    });
    setUser(null);
  }, []);

  const updateProfile = useCallback(
    async (input: { name: string; phone?: string }) => {
      const data = await apiRequest<{ user: User }>("/api/auth/me", {
        method: "PATCH",
        body: JSON.stringify(input),
      });
      setUser(data.user);
      return data.user;
    },
    []
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        signup,
        logout,
        updateProfile,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return ctx;
}
