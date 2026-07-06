"use client";

import { Suspense, useState, useEffect } from "react";
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
import styles from "./login-page.module.css";

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
    const remembered = getRememberedRole();
    if (remembered) return remembered;
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
      className={styles.authpage}
      data-login-role={role}
      style={
        {
          "--login-accent": config.theme.accent,
          "--login-accent2": config.theme.accent2,
          "--login-tint": config.theme.tint,
          "--login-hero-grad": config.theme.heroGrad,
          "--login-blob": config.theme.blob,
          "--login-dot": config.theme.dot,
          "--login-highlight": config.theme.highlight,
        } as React.CSSProperties
      }
    >
      <div className={styles.authGrid}>
        <LoginHero config={config} />
        <div className={styles.formWrap}>
          <AuthForm roleConfig={config} />
        </div>
      </div>
    </div>
  );
}