"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { HelpCircle } from "lucide-react";
import { Onborda, OnbordaProvider, useOnborda, type Step } from "onborda";
import { useAuth } from "@/providers/auth-provider";
import { resolveTour, type TourDefinition, type TourScope } from "./tours";
import { TourCard } from "./tour-card";

const STORAGE_PREFIX = "onborda:v1";

function seenKey(userId: string, tour: string) {
  return `${STORAGE_PREFIX}:${userId}:${tour}`;
}

function hasSeenTour(userId: string, tour: string): boolean {
  if (typeof window === "undefined") return true;
  try {
    return window.localStorage.getItem(seenKey(userId, tour)) === "1";
  } catch {
    return false;
  }
}

function markTourSeen(userId: string, tour: string) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(seenKey(userId, tour), "1");
  } catch {
    /* ignore storage failures (private mode, quota, etc.) */
  }
}

/** An element counts as a valid target only when it renders a layout box. */
function isVisible(element: Element | null): boolean {
  return !!element && (element as HTMLElement).getClientRects().length > 0;
}

function visibleSteps(steps: Step[]): Step[] {
  return steps.filter((step) => isVisible(document.querySelector(step.selector)));
}

function OnboardingInner({
  scope,
  children,
}: {
  scope: TourScope;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const { user, isLoading } = useAuth();
  const { startOnborda, closeOnborda } = useOnborda();

  const userId = user?.id ?? "anon";
  // Onborda resolves the active tour by name from this array, so it always
  // holds exactly the (visibility-filtered) tour for the current page.
  const [tours, setTours] = useState<TourDefinition[]>([]);
  const pendingStartRef = useRef<string | null>(null);

  // Dismiss any in-flight tour when the route changes so step indices reset.
  useEffect(() => {
    closeOnborda();
    pendingStartRef.current = null;
  }, [pathname, closeOnborda]);

  useEffect(() => {
    if (isLoading || !pathname) return;

    const definition = resolveTour(scope, pathname);
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let attempts = 0;
    const maxAttempts = 25; // ~3.75s of polling for late-mounting content

    // All state updates run inside this scheduled callback (never synchronously
    // in the effect body) and wait until the step targets are actually mounted.
    const resolveOnce = () => {
      if (cancelled) return;

      if (!definition) {
        setTours([]);
        pendingStartRef.current = null;
        return;
      }

      const steps = visibleSteps(definition.steps);
      if (steps.length === 0) {
        if (attempts < maxAttempts) {
          attempts += 1;
          timer = setTimeout(resolveOnce, 150);
        } else {
          setTours([]);
          pendingStartRef.current = null;
        }
        return;
      }

      setTours([{ tour: definition.tour, steps }]);
      if (!hasSeenTour(userId, definition.tour)) {
        markTourSeen(userId, definition.tour);
        pendingStartRef.current = definition.tour;
      }
    };

    timer = setTimeout(resolveOnce, 0);
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [pathname, scope, userId, isLoading]);

  // Kick off the auto-tour once its steps are mounted into the Onborda config.
  useEffect(() => {
    const pending = pendingStartRef.current;
    if (pending && tours.some((tour) => tour.tour === pending)) {
      pendingStartRef.current = null;
      startOnborda(pending);
    }
  }, [tours, startOnborda]);

  const replayTour = useCallback(() => {
    const current = tours[0];
    if (current) startOnborda(current.tour);
  }, [tours, startOnborda]);

  return (
    <Onborda
      steps={tours}
      cardComponent={TourCard}
      shadowRgb="17, 17, 17"
      shadowOpacity="0.55"
    >
      {children}
      {tours.length > 0 ? (
        <button
          type="button"
          onClick={replayTour}
          aria-label="Replay page tour"
          className="fixed bottom-5 right-5 z-40 flex size-11 items-center justify-center rounded-full border border-border/60 bg-card text-muted-foreground shadow-lg shadow-black/10 transition-colors hover:bg-muted hover:text-foreground"
        >
          <HelpCircle className="size-5" />
        </button>
      ) : null}
    </Onborda>
  );
}

/**
 * Drop-in onboarding runtime for an authenticated workspace. Mount it inside the
 * authenticated providers so it can read the current user for per-account tour
 * persistence.
 */
export function OnboardingRuntime({
  scope,
  children,
}: {
  scope: TourScope;
  children: ReactNode;
}) {
  return (
    <OnbordaProvider>
      <OnboardingInner scope={scope}>{children}</OnboardingInner>
    </OnbordaProvider>
  );
}
