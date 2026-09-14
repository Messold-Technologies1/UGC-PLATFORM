"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { CSSProperties, ReactNode } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { toast } from "sonner";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import {
  authMeQueryKey,
  useMeQuery,
  type AuthUser,
} from "@/features/auth/hooks/use-me-query";
import {
  chooseWorkspaceRole,
  type OnboardingRole,
} from "@/features/auth/api/onboarding";
import { resolveImmediatePostAuthPath } from "@/features/auth/lib/resolve-immediate-post-auth-path";
import { beginClientNavigation } from "@/lib/client-navigation-state";

const AURORA_BG: CSSProperties = {
  background:
    "radial-gradient(120% 90% at 12% 8%, #7a2a4d 0%, rgba(122,42,77,0) 55%)," +
    "radial-gradient(130% 100% at 92% 96%, #c2143f 0%, rgba(194,20,63,0) 52%)," +
    "linear-gradient(135deg, #6e2545 0%, #8f1a41 52%, #B3123F 100%)",
};

function readError(error: unknown): string {
  if (isAxiosError(error)) {
    if (error.response?.status === 409) {
      const data = error.response?.data as { message?: unknown } | undefined;
      if (typeof data?.message === "string") return data.message;
      return "This email is already registered as a different account type.";
    }
  }
  return "Could not set up your workspace. Please try again.";
}

function CreatorIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 8.5C4 7.7 4.7 7 5.5 7H8L9 5.5H15L16 7H18.5C19.3 7 20 7.7 20 8.5V17C20 17.8 19.3 18.5 18.5 18.5H5.5C4.7 18.5 4 17.8 4 17V8.5Z"
        stroke="#fff"
        strokeWidth="1.7"
      />
      <circle cx="12" cy="12.5" r="3.2" stroke="#fff" strokeWidth="1.7" />
    </svg>
  );
}

function BrandIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 10.5V13.5L14 18V6L4 10.5Z"
        stroke="#fff"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path
        d="M14 8.5C16 9 17 10.3 17 12C17 13.7 16 15 14 15.5"
        stroke="#fff"
        strokeWidth="1.7"
      />
    </svg>
  );
}

function FullScreenSpinner() {
  return (
    <div
      className="flex min-h-dvh w-full items-center justify-center"
      style={AURORA_BG}
    >
      <Spinner className="size-8 text-white" />
    </div>
  );
}

export function RoleChoiceView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const callbackUrl = searchParams.get("callbackUrl");
  const { data: user = null, isPending } = useMeQuery();
  const [selected, setSelected] = useState<OnboardingRole>("CREATOR");
  // The role-less, authenticated user is the only one who stays on this screen;
  // everyone else is redirected by the effect below.
  const needsRoleChoice =
    !!user && !user.primaryRole && user.roles.length === 0;

  const mutation = useMutation({
    mutationFn: chooseWorkspaceRole,
    onSuccess: (updated: AuthUser) => {
      queryClient.setQueryData(authMeQueryKey, updated);
      // Creator → straight into Edit Profile to fill in the rest (name, phone,
      // categories, portfolio…). Brand → resolveImmediatePostAuthPath sends a
      // BRAND-without-profile account to the brand setup screen.
      const target =
        updated.primaryRole === "CREATOR"
          ? "/creator/settings/profile"
          : resolveImmediatePostAuthPath(updated, callbackUrl);
      beginClientNavigation();
      window.location.replace(target);
    },
    onError: (error) => toast.error(readError(error)),
  });

  useEffect(() => {
    if (isPending) return;
    if (!user) {
      beginClientNavigation();
      router.replace("/login");
      return;
    }
    // Already has a workspace — don't let them re-pick; route them home.
    if (user.primaryRole || user.roles.length > 0) {
      beginClientNavigation();
      router.replace(resolveImmediatePostAuthPath(user, callbackUrl));
    }
  }, [callbackUrl, isPending, router, user]);

  const pick = useCallback((role: OnboardingRole) => setSelected(role), []);

  if (!user || !needsRoleChoice) {
    return <FullScreenSpinner />;
  }

  const cards: Array<{
    role: OnboardingRole;
    title: string;
    desc: string;
    accent: string;
    icon: ReactNode;
  }> = [
    {
      role: "CREATOR",
      title: "I’m a Creator",
      desc: "Build a profile, list your packages and rates, and get discovered by brands hiring for UGC.",
      accent: "#B3123F",
      icon: <CreatorIcon />,
    },
    {
      role: "BRAND",
      title: "I’m a Brand",
      desc: "Search creators, shortlist by rate and niche, and manage collaborations from brief to delivery.",
      accent: "#6e2545",
      icon: <BrandIcon />,
    },
  ];

  return (
    <div
      className="flex min-h-dvh w-full items-center justify-center px-5 py-16"
      style={AURORA_BG}
    >
      <div className="w-full max-w-[760px] text-center">
        <h1 className="text-[32px] font-extrabold tracking-tight text-white sm:text-[40px]">
          How will you use GoCollab?
        </h1>
        <p className="mx-auto mt-3.5 mb-9 max-w-[520px] text-[15px] text-white/80">
          Choose your world. We’ll build everything around it.
        </p>

        <div className="grid grid-cols-1 gap-5 text-left sm:grid-cols-2">
          {cards.map((c) => {
            const isSelected = selected === c.role;
            return (
              <button
                key={c.role}
                type="button"
                onClick={() => pick(c.role)}
                disabled={mutation.isPending}
                aria-pressed={isSelected}
                className={cn(
                  "group rounded-[20px] p-7 text-left transition disabled:cursor-default",
                  isSelected
                    ? "border-[2.5px] border-white bg-white shadow-[0_30px_70px_-28px_rgba(20,4,12,0.6)]"
                    : "border-2 border-white/25 bg-white/[0.08] hover:border-white/50",
                )}
              >
                <div className="flex items-center justify-between">
                  <span
                    className="flex size-[52px] items-center justify-center rounded-[15px]"
                    style={{ background: c.accent }}
                  >
                    {c.icon}
                  </span>
                  <span
                    className={cn(
                      "flex size-6 items-center justify-center rounded-full border-2",
                      isSelected
                        ? "border-transparent"
                        : "border-white/50",
                    )}
                    style={isSelected ? { background: c.accent } : undefined}
                  >
                    {isSelected ? (
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        aria-hidden
                      >
                        <path
                          d="M5 12.5L10 17.5L19 7.5"
                          stroke="#fff"
                          strokeWidth="2.4"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    ) : null}
                  </span>
                </div>
                <h3
                  className={cn(
                    "mt-5 text-[21px] font-extrabold",
                    isSelected ? "text-[#181313]" : "text-white",
                  )}
                >
                  {c.title}
                </h3>
                <p
                  className={cn(
                    "mt-2 text-[13.5px] leading-relaxed",
                    isSelected ? "text-[#6b6469]" : "text-white/75",
                  )}
                >
                  {c.desc}
                </p>
              </button>
            );
          })}
        </div>

        <button
          type="button"
          disabled={mutation.isPending}
          onClick={() => mutation.mutate(selected)}
          className="mt-9 inline-flex h-[52px] items-center justify-center gap-2 rounded-[13px] border-0 bg-white px-10 text-[15px] font-bold text-[#181313] shadow-[0_12px_28px_-10px_rgba(0,0,0,0.4)] transition hover:-translate-y-px disabled:cursor-default disabled:opacity-80"
        >
          {mutation.isPending ? (
            <>
              <Spinner className="size-4" aria-hidden /> Setting up…
            </>
          ) : (
            <>Continue as {selected === "CREATOR" ? "Creator" : "Brand"} →</>
          )}
        </button>
      </div>
    </div>
  );
}
