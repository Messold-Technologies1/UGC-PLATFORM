"use client";

import type { LoginRoleConfig } from "@/features/auth/lib/login-role-config";
import { AuthLogoLink } from "./auth-logo-link";
import styles from "./login-page.module.css";

interface LoginHeroProps {
  config: LoginRoleConfig;
}

export function LoginHero({ config }: LoginHeroProps) {
  const RoleIcon = config.icon;
  const [line1, line2] = config.headline;

  return (
    <div className={`${styles.hero} hidden lg:flex`}>
      <div
        className={`${styles.blob} ${styles.blobTop}`}
        aria-hidden="true"
      />
      <div
        className={`${styles.blob} ${styles.blobBottom}`}
        aria-hidden="true"
      />
      <div className={styles.grain} aria-hidden="true" />

      <div className={styles.heroTop}>
        <AuthLogoLink className="-ml-4" imageClassName="h-24 md:h-32" />
      </div>

      <div className={styles.heroMid}>
        <span className={styles.heroEyebrow}>
          <RoleIcon size={13} aria-hidden="true" />
          {config.eyebrow}
        </span>

        <h1 className={`${styles.heroH1} font-heading`}>
          {line1}
          <br />
          <span className={styles.heroHighlight}>{line2}</span>
        </h1>

        <p className={styles.heroSub}>{config.sub}</p>

        <ul className={styles.heroBullets}>
          {config.bullets.map((bullet) => {
            const BulletIcon = bullet.icon;
            return (
              <li key={bullet.title} className={styles.heroBulletItem}>
                <span className={styles.heroBulletIcon}>
                  <BulletIcon size={18} aria-hidden="true" />
                </span>
                <span>
                  <span className={styles.heroBulletTitle}>
                    {bullet.title}
                  </span>
                  <span className={styles.heroBulletDesc}>{bullet.desc}</span>
                </span>
              </li>
            );
          })}
        </ul>
      </div>

      <div className={styles.heroBottom}>
        <div className={styles.heroStat}>
          <span className={`${styles.heroStatBig} font-heading`}>
            {config.stat.big}
          </span>
          <span className={styles.heroStatLabel}>{config.stat.label}</span>
        </div>

        <div className={styles.heroProof}>
          <span className={`${styles.heroQuoteMark} font-heading`}>
            &ldquo;
          </span>
          <div>
            <div className={styles.heroQuoteText}>{config.quote}</div>
            <div className={styles.heroQuoteAuthor}>
              <span className={styles.heroQuoteAvatar}>
                {config.authorInitials}
              </span>
              <div>
                <div className={styles.heroQuoteName}>{config.author}</div>
                <div className={styles.heroQuoteRole}>
                  {config.authorRole}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
