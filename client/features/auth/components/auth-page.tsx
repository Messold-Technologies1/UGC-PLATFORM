"use client";

import { Suspense, useState, useEffect, type CSSProperties } from "react";
import { useSearchParams } from "next/navigation";
import { AuthForm } from "./auth-form";

import { LoginHero } from "./login-hero";
import {
  parseLoginRole,
  getRememberedRole,
  ROLE_CONFIGS,
  type LoginRole,
} from "@/features/auth/lib/login-role-config";
import {
  inferLoginRoleFromPath,
  normalizeCallbackPath,
} from "@/features/auth/lib/login-redirect";

export function AuthPage() {
  return (
    <Suspense fallback={null}>
      <LoginRouter />
    </Suspense>
  );
}

function LoginRouter() {
  const searchParams = useSearchParams();
  const roleParam = parseLoginRole(searchParams.get("role"));
  const callbackUrl = searchParams.get("callbackUrl");
  const callbackPath = callbackUrl
    ? normalizeCallbackPath(callbackUrl, "")
    : "";

  const [role, setRole] = useState<LoginRole>(() => {
    if (roleParam) return roleParam;
    const inferred = callbackPath ? inferLoginRoleFromPath(callbackPath) : null;
    if (inferred) return inferred;
    return "brand";
  });

  useEffect(() => {
    if (roleParam) {
      setRole(roleParam);
      return;
    }
    const inferred = callbackPath ? inferLoginRoleFromPath(callbackPath) : null;
    if (inferred) {
      setRole(inferred);
      return;
    }
    const remembered = getRememberedRole();
    if (remembered) {
      setRole(remembered);
    }
  }, [roleParam, callbackPath]);

  const config = ROLE_CONFIGS[role];

  return (
    <div
      className="min-h-dvh bg-white"
      data-login-role={role}
      style={{ "--login-accent": config.theme.accent } as CSSProperties}
    >
      <div className="grid min-h-dvh lg:grid-cols-2">
        <LoginHero config={config} />
        <div className="flex items-center justify-center bg-white px-6 pt-24 pb-10 sm:px-10 lg:px-16 xl:px-18">
          <AuthForm roleConfig={config} />
        </div>
      </div>
    </div>
  );
}
