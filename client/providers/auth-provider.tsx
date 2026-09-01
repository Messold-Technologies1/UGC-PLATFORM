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
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { Spinner } from "@/components/ui/spinner";
import api from "@/lib/api";
import { beginClientNavigation } from "@/lib/client-navigation-state";
import { ENDPOINTS } from "@/lib/endpoints";
import { disconnectSocket } from "@/lib/socket";
import { getPostLogoutLoginHref } from "@/features/auth/lib/login-redirect";
import {
  parseLoginRole,
  setRememberedRole,
} from "@/features/auth/lib/login-role-config";
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
  refreshUser: () => Promise<AuthUser | null>;
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
    const result = await refetch();
    return result.data ?? null;
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
      // Session is still cleared locally so the user can sign in again.
    } finally {
      const redirectPath = getPostLogoutLoginHref({
        primaryRole: user?.primaryRole,
      });
      const roleFromHref = new URLSearchParams(
        redirectPath.split("?")[1] ?? "",
      ).get("role");
      const remembered = parseLoginRole(roleFromHref);
      if (remembered) setRememberedRole(remembered);

      disconnectSocket();
      queryClient.setQueryData(authMeQueryKey, null);
      queryClient.clear();
      beginClientNavigation();
      router.replace(redirectPath);
      logoutStartedRef.current = false;
      setIsLoggingOut(false);
    }
  }, [queryClient, router, user?.primaryRole]);

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
          <Spinner className="size-10 text-primary" aria-hidden />
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
