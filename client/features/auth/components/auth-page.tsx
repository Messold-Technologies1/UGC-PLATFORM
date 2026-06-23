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

  const [role, setRole] = useState<LoginRole>(() => {
    if (roleParam) return roleParam;
    if (callbackUrl) {
      const path = callbackUrl.split("?")[0];
      if (path.startsWith("/creator")) return "creator";
      if (path.startsWith("/brand")) return "brand";
    }
    const remembered = getRememberedRole();
    if (remembered) return remembered;
    return "brand";
  });

  useEffect(() => {
    if (roleParam) {
      setRole(roleParam);
      return;
    }
    if (callbackUrl) {
      const path = callbackUrl.split("?")[0];
      if (path.startsWith("/creator")) {
        setRole("creator");
        return;
      }
      if (path.startsWith("/brand")) {
        setRole("brand");
        return;
      }
    }
    const remembered = getRememberedRole();
    if (remembered) {
      setRole(remembered);
    }
  }, [roleParam, callbackUrl]);

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