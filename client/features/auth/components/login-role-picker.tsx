"use client";

import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import {
  LOGIN_ROLES,
  ROLE_CONFIGS,
  setRememberedRole,
  type LoginRole,
} from "@/features/auth/lib/login-role-config";
import styles from "./login-page.module.css";

export function LoginRolePicker() {
  return (
    <div className={styles.picker}>
      <div className={styles.pickerInner}>
        <Link href="/" className={`${styles.pickerLogo} font-heading`} aria-label="Go to GoCollab home">
          <span className={styles.pickerLogoDot}>G</span>
          GoCollab
        </Link>
        <h1 className="font-heading mt-[30px] text-[clamp(28px,4vw,40px)] font-extrabold tracking-tight">
          How do you want to log in?
        </h1>
        <p className="mt-3 text-[15.5px] text-muted-foreground">
          Choose your account type to continue to the right workspace.
        </p>
        <div className={styles.roleCards}>
          {LOGIN_ROLES.map((roleKey) => {
            const config = ROLE_CONFIGS[roleKey];
            const RoleIcon = config.icon;
            return (
              <Link
                key={roleKey}
                href={`/login?role=${roleKey}`}
                replace
                className={styles.roleCard}
                style={
                  {
                    "--card-accent": config.theme.accent,
                    "--card-tint": config.theme.tint,
                  } as React.CSSProperties
                }
                onClick={() => setRememberedRole(roleKey as LoginRole)}
              >
                <span className={styles.roleCardIcon}>
                  <RoleIcon size={24} aria-hidden="true" />
                </span>
                <div className={`${styles.roleCardName} font-heading`}>
                  {config.name === "Brand"
                    ? "Brands"
                    : config.name === "Creator"
                      ? "Creators"
                      : "Agencies"}
                </div>
                <div className={styles.roleCardDesc}>{config.sub}</div>
                <div className={styles.roleCardFeats}>
                  {config.bullets.map((b) => (
                    <span key={b.title} className={styles.roleCardFeat}>
                      <Check
                        size={14}
                        strokeWidth={2.5}
                        className={styles.roleCardFeatIcon}
                        aria-hidden="true"
                      />
                      {b.title}
                    </span>
                  ))}
                </div>
                <span className={styles.roleCardCta}>
                  <span className="whitespace-nowrap">
                    Log in as {config.name}
                  </span>
                  <ArrowRight
                    size={16}
                    className={styles.roleCardCtaArrow}
                    aria-hidden="true"
                  />
                </span>
              </Link>
            );
          })}
        </div>

        <p className={styles.pickerTerms}>
          Protected by reCAPTCHA ·{" "}
          <Link href="/legal/terms" prefetch={false} className={styles.pickerTermsLink}>
            Terms
          </Link>{" "}
          ·{" "}
          <Link href="/legal/privacy" prefetch={false} className={styles.pickerTermsLink}>
            Privacy
          </Link>
        </p>
      </div>
    </div>
  );
}
