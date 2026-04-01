"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
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
  isLoggingOut: boolean;
  isAuthenticated: boolean;
  refreshUser: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: user = null, isPending: isLoading, refetch } = useMeQuery();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const logoutStartedRef = useRef(false);

  const refreshUser = useCallback(async () => {
    await refetch();
  }, [refetch]);

  const logout = useCallback(async () => {
    if (logoutStartedRef.current) return;
    logoutStartedRef.current = true;
    setIsLoggingOut(true);
    void queryClient.cancelQueries();
    try {
      await api.post(ENDPOINTS.AUTH.LOGOUT, undefined, {
        timeout: 12_000,
      });
    } catch {
      
    } finally {
      queryClient.setQueryData(authMeQueryKey, null);
      queryClient.clear();
      router.replace("/");
      logoutStartedRef.current = false;
      setIsLoggingOut(false);
    }
  }, [queryClient, router]);

  const value = useMemo(
    () => ({
      user,
      isLoading,
      isLoggingOut,
      isAuthenticated: !!user,
      refreshUser,
      logout,
    }),
    [user, isLoading, isLoggingOut, refreshUser, logout],
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
      {isLoggingOut ? (
        <div
          className="fixed inset-0 z-200 flex flex-col items-center justify-center gap-3 bg-background/70 backdrop-blur-sm"
          role="status"
          aria-live="polite"
          aria-busy="true"
        >
          <Loader2
            className="size-10 animate-spin text-primary"
            aria-hidden
          />
          <p className="text-sm font-medium text-foreground">Logging out…</p>
        </div>
      ) : null}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
