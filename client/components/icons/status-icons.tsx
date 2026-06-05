import * as React from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export function VerifiedBadge() {
  return (
    <span
      className="inline-flex size-6 items-center justify-center rounded-full bg-blue-500 text-white"
      title="Verified Creator"
      aria-label="Verified"
    >
      <Check className="size-3.5" strokeWidth={3} />
    </span>
  );
}

export function GreenCheck({ size = "md" }: { size?: "sm" | "md" }) {
  const sizeClass = size === "sm" ? "size-5" : "size-6";
  const iconClass = size === "sm" ? "size-3" : "size-3.5";

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600",
        sizeClass,
      )}
      aria-hidden="true"
    >
      <Check className={iconClass} strokeWidth={3} />
    </span>
  );
}
