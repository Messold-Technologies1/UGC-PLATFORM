"use client";

import { Suspense, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { AuthForm } from "./auth-form";
import { DashboardPreview } from "./dashboard-preview";
import { LoginHero } from "./login-hero";
import {
  parseLoginRole,
  getRememberedRole,
  ROLE_CONFIGS,
  type LoginRole,
} from "@/features/auth/lib/login-role-config";
import styles from "./login-page.module.css";

interface AuthPageProps {
  mode: "login" | "signup";
}

export function AuthPage({ mode }: AuthPageProps) {
  // Signup mode: use the original layout with DashboardPreview, untouched.
  if (mode === "signup") {
    return (
      <div className="grid min-h-dvh lg:grid-cols-2">
        <DashboardPreview />
        <Suspense fallback={null}>
          <AuthForm mode={mode} />
        </Suspense>
      </div>
    );
  }

  return (
    <Suspense fallback={null}>
      <LoginRouter />
    </Suspense>
  );
}

function LoginRouter() {
  const searchParams = useSearchParams();
  const roleParam = parseLoginRole(searchParams.get("role"));
  
  // Use state to prevent hydration mismatch.
  // Both server and first client render will use the same default.
  const [role, setRole] = useState<LoginRole>(roleParam ?? "brand");

  // On mount, update role from localStorage if no explicit URL param was provided.
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
