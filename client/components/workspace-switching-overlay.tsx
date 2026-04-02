"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  clearWorkspaceSwitchState,
  useWorkspaceSwitchState,
} from "@/features/auth/lib/workspace-switch-state";
import { Spinner } from "@/components/ui/spinner";

const OVERLAY_SHOW_DELAY_MS = 120;
const OVERLAY_MIN_VISIBLE_MS = 240;

function labelForRole(role: "CREATOR" | "BRAND" | null) {
  if (role === "CREATOR") return "creator";
  if (role === "BRAND") return "brand";
  return "workspace";
}

export function WorkspaceSwitchingOverlay() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { isSwitching, targetRole } = useWorkspaceSwitchState();
  const [visible, setVisible] = useState(false);
  const showTimeoutRef = useRef<number | null>(null);
  const clearTimeoutRef = useRef<number | null>(null);
  const routeAtSwitchStartRef = useRef<string | null>(null);
  const visibleSinceRef = useRef<number | null>(null);
  const wasSwitchingRef = useRef(false);

  const routeKey = useMemo(
    () => `${pathname}?${searchParams.toString()}`,
    [pathname, searchParams],
  );

  useEffect(() => {
    return () => {
      if (showTimeoutRef.current != null) {
        window.clearTimeout(showTimeoutRef.current);
      }
      if (clearTimeoutRef.current != null) {
        window.clearTimeout(clearTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!isSwitching) {
      if (showTimeoutRef.current != null) {
        window.clearTimeout(showTimeoutRef.current);
        showTimeoutRef.current = null;
      }
      if (clearTimeoutRef.current != null) {
        window.clearTimeout(clearTimeoutRef.current);
        clearTimeoutRef.current = null;
      }
      routeAtSwitchStartRef.current = null;
      visibleSinceRef.current = null;
      wasSwitchingRef.current = false;
      setVisible(false);
      return;
    }

    if (wasSwitchingRef.current) return;
    wasSwitchingRef.current = true;
    routeAtSwitchStartRef.current = routeKey;
    visibleSinceRef.current = null;
    setVisible(false);

    if (showTimeoutRef.current != null) {
      window.clearTimeout(showTimeoutRef.current);
    }

    showTimeoutRef.current = window.setTimeout(() => {
      visibleSinceRef.current = Date.now();
      setVisible(true);
      showTimeoutRef.current = null;
    }, OVERLAY_SHOW_DELAY_MS);
  }, [isSwitching, routeKey]);

  useEffect(() => {
    if (!isSwitching) return;
    if (!routeAtSwitchStartRef.current) return;
    if (routeKey === routeAtSwitchStartRef.current) return;

    if (showTimeoutRef.current != null) {
      window.clearTimeout(showTimeoutRef.current);
      showTimeoutRef.current = null;
    }

    const clearNow = () => {
      if (clearTimeoutRef.current != null) {
        window.clearTimeout(clearTimeoutRef.current);
        clearTimeoutRef.current = null;
      }
      setVisible(false);
      visibleSinceRef.current = null;
      routeAtSwitchStartRef.current = null;
      clearWorkspaceSwitchState();
    };

    const elapsed = visibleSinceRef.current
      ? Date.now() - visibleSinceRef.current
      : OVERLAY_MIN_VISIBLE_MS;
    const remaining = Math.max(0, OVERLAY_MIN_VISIBLE_MS - elapsed);

    if (remaining === 0) {
      clearNow();
      return;
    }

    clearTimeoutRef.current = window.setTimeout(clearNow, remaining);
  }, [isSwitching, routeKey]);

  if (!isSwitching || !visible) return null;

  return (
    <div
      className="fixed inset-0 z-240 flex flex-col items-center justify-center gap-3 bg-background/65 backdrop-blur-sm"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <Spinner className="size-9 text-primary" aria-hidden />
      <p className="text-sm font-medium text-foreground">
        Switching to {labelForRole(targetRole)} workspace...
      </p>
    </div>
  );
}
