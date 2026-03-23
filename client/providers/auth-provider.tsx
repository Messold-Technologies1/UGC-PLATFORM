"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  type ReactNode,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { ENDPOINTS } from "@/lib/endpoints";
import {
  authMeQueryKey,
  type AuthUser,
  useMeQuery,
} from "@/features/auth/hooks/use-me-query";

export type { AuthUser };

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  refreshUser: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const { data: user = null, isPending: isLoading, refetch } = useMeQuery();

  const refreshUser = useCallback(async () => {
    await refetch();
  }, [refetch]);

  const logout = useCallback(async () => {
    try {
      await api.post(ENDPOINTS.AUTH.LOGOUT);
    } finally {
      queryClient.setQueryData(authMeQueryKey, null);
      window.location.href = "/login";
    }
  }, [queryClient]);

  const value = useMemo(
    () => ({
      user,
      isLoading,
      isAuthenticated: !!user,
      refreshUser,
      logout,
    }),
    [user, isLoading, refreshUser, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
