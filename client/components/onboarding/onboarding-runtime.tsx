"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { HelpCircle } from "lucide-react";
import { Onborda, OnbordaProvider, useOnborda, type Step } from "onborda";
import { useAuth } from "@/providers/auth-provider";
import { resolveTour, type TourDefinition, type TourScope } from "./tours";
import { TourCard } from "./tour-card";
import "./onboarding.css";

const STORAGE_PREFIX = "onborda:v1";
const TALL_SECTION_HEIGHT = 500;
const TOUR_CARD_WIDTH = 320;
const VIEWPORT_MARGIN = 16;

const BOTTOM_SIDES = new Set(["bottom", "bottom-left", "bottom-right"]);

/** Navbar anchors are small pills — never auto-flip them to a side placement. */
function isNavAnchor(selector: string) {
  return /\[data-tour="nav-[^"]+"\]/.test(selector);
}

/** Tab buttons and similar compact controls should keep their configured side. */
function isCompactAnchor(selector: string) {
  return (
    isNavAnchor(selector) ||
    /\[data-tour="[^"]*-tab-[^"]+"\]/.test(selector) ||
    selector.includes("creator-orders-tabs")
  );
}

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

/** Tall targets push bottom-placed cards off-screen — prefer a side placement instead. */
function resolveStepSide(step: Step): Step["side"] {
  const side = step.side ?? "bottom";
  if (!BOTTOM_SIDES.has(side) || isCompactAnchor(step.selector)) return side;

  const element = document.querySelector(step.selector);
  if (!element) return side;

  const { height, left, right } = element.getBoundingClientRect();
  if (height <= TALL_SECTION_HEIGHT) return side;

  const cardWidth = TOUR_CARD_WIDTH + 25;
  const roomOnRight = window.innerWidth - right - VIEWPORT_MARGIN;
  const roomOnLeft = left - VIEWPORT_MARGIN;

  if (roomOnRight >= cardWidth) return "right";
  if (roomOnLeft >= cardWidth) return "left";
  return "right";
}

function prepareSteps(steps: Step[]): Step[] {
  return visibleSteps(steps).map((step) => ({
    ...step,
    side: resolveStepSide(step),
  }));
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

      const steps = prepareSteps(definition.steps);
      const waitingForReady =
        !!definition.readySelector &&
        !document.querySelector(definition.readySelector);

      if (steps.length === 0 || waitingForReady) {
        if (attempts < maxAttempts) {
          attempts += 1;
          timer = setTimeout(resolveOnce, 150);
        } else {
          setTours(steps.length > 0 ? [{ tour: definition.tour, steps }] : []);
          if (steps.length > 0 && !hasSeenTour(userId, definition.tour)) {
            pendingStartRef.current = definition.tour;
          } else {
            pendingStartRef.current = null;
          }
        }
        return;
      }

      setTours([{ tour: definition.tour, steps }]);
      if (!hasSeenTour(userId, definition.tour)) {
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
      markTourSeen(userId, pending);
    }
  }, [tours, startOnborda, userId]);

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
          className="fixed bottom-5 right-5 z-[1010] flex size-11 items-center justify-center rounded-full border border-border/60 bg-card text-muted-foreground shadow-lg shadow-black/10 transition-colors hover:bg-muted hover:text-foreground"
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
