"use client";

import { Loader2 } from "lucide-react";
import { useWorkspaceSwitchState } from "@/features/auth/lib/workspace-switch-state";

function labelForRole(role: "CREATOR" | "BRAND" | null) {
  if (role === "CREATOR") return "creator";
  if (role === "BRAND") return "brand";
  return "workspace";
}

export function WorkspaceSwitchingOverlay() {
  const { isSwitching, targetRole } = useWorkspaceSwitchState();

  if (!isSwitching) return null;

  return (
    <div
      className="fixed inset-0 z-240 flex flex-col items-center justify-center gap-3 bg-background/65 backdrop-blur-sm"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <Loader2 className="size-9 animate-spin text-primary" aria-hidden />
      <p className="text-sm font-medium text-foreground">
        Switching to {labelForRole(targetRole)} workspace...
      </p>
    </div>
  );
}
