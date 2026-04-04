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

export function WorkspaceSwitchingOverlayInner({
  targetRole,
}: {
  targetRole: "CREATOR" | "BRAND" | null;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [visible, setVisible] = useState(false);
  const showTimeoutRef = useRef<number | null>(null);
  const clearTimeoutRef = useRef<number | null>(null);
  const visibleSinceRef = useRef<number | null>(null);

  const routeKey = useMemo(
    () => `${pathname}?${searchParams.toString()}`,
    [pathname, searchParams],
  );

  const [initialRouteKey] = useState(routeKey);

  useEffect(() => {
    showTimeoutRef.current = window.setTimeout(() => {
      visibleSinceRef.current = Date.now();
      setVisible(true);
      showTimeoutRef.current = null;
    }, OVERLAY_SHOW_DELAY_MS);

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
    if (routeKey === initialRouteKey) return;
    if (clearTimeoutRef.current != null) return;

    if (showTimeoutRef.current != null) {
      window.clearTimeout(showTimeoutRef.current);
      showTimeoutRef.current = null;
    }

    const clearNow = () => {
      clearWorkspaceSwitchState();
    };

    const elapsed = visibleSinceRef.current
      ? Date.now() - visibleSinceRef.current
      : OVERLAY_MIN_VISIBLE_MS;
    const remaining = Math.max(0, OVERLAY_MIN_VISIBLE_MS - elapsed);

    if (remaining === 0) {
      clearNow();
    } else {
      clearTimeoutRef.current = window.setTimeout(clearNow, remaining);
    }
  }, [routeKey, initialRouteKey]);

  if (!visible) return null;

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

export function WorkspaceSwitchingOverlay() {
  const { isSwitching, targetRole } = useWorkspaceSwitchState();

  if (!isSwitching) return null;

  return <WorkspaceSwitchingOverlayInner targetRole={targetRole} />;
}
