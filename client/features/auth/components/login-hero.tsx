"use client";

import type { LoginRoleConfig } from "@/features/auth/lib/login-role-config";

interface LoginHeroProps {
  config: LoginRoleConfig;
}

export function LoginHero({ config }: LoginHeroProps) {
  const headline = config.headline.filter(Boolean).join(" ");

  return (
    <div
      className="relative hidden min-h-dvh flex-col justify-center px-16 pt-28 pb-18 lg:flex xl:px-20"
      style={{ backgroundColor: config.theme.heroGrad }}
    >
      <p className="text-[11px] font-bold tracking-[0.16em] text-[#9A9498] uppercase">
        {config.eyebrow}
      </p>

      <div className="mt-7 max-w-115">
        <h1 className="font-heading text-[clamp(30px,3.2vw,42px)] leading-[1.12] font-bold tracking-[-0.035em] text-[#181313]">
          {headline}
        </h1>
        <p className="mt-4 max-w-[42ch] text-[15.5px] leading-relaxed text-[#8B8489]">
          {config.sub}
        </p>

        <ul className="mt-9">
          {config.bullets.map((bullet) => (
            <li
              key={bullet.title}
              className="border-t py-5.5"
              style={{ borderColor: config.theme.hairline }}
            >
              <span className="block text-base font-bold text-[#181313]">
                {bullet.title}
              </span>
              <span className="mt-1.5 block text-[14.5px] leading-snug text-[#8B8489]">
                {bullet.desc}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
