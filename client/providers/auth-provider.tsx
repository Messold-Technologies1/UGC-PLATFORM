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
import { clearActiveBrandProfileId } from "@/lib/active-brand-context";
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
      // The push subscription deliberately SURVIVES sign-out. It belongs to
      // the browser, not to the session, and keeping it is what lets a
      // notification be the thing that brings someone back — which is most of
      // the point of having it. Clicking one lands on the login page.
      //
      // The subscription is re-pointed, not duplicated, when somebody else
      // signs in on this browser and turns notifications on: the server
      // upserts on the endpoint. Until that happens this browser still shows
      // the previous account's notifications, which is the cost of the
      // behaviour above and the reason not to keep message text in them.
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
      // The next person to sign in on this machine must not inherit the last
      // one's workspace.
      clearActiveBrandProfileId();
      queryClient.setQueryData(authMeQueryKey, null);
      queryClient.clear();
      beginClientNavigation();
      router.replace(redirectPath);
      router.refresh();
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
