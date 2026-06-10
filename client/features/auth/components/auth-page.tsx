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
  const [role, setRole] = useState<LoginRole>(roleParam ?? "brand");
  useEffect(() => {
    if (roleParam) {
      setRole(roleParam);
    } else {
      const remembered = getRememberedRole();
      if (remembered) {
        setRole(remembered);
      }
    }
  }, [roleParam]);

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
          <AuthForm mode="login" roleConfig={config} />
        </div>
      </div>
    </div>
  );
}
