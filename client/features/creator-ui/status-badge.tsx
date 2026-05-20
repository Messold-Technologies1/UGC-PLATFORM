import { cn } from "@/lib/utils";
import { type ReactNode } from "react";

interface StatusBadgeProps {
  children: ReactNode;
  colorClass: string;
  className?: string;
}

export function StatusBadge({ children, colorClass, className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border whitespace-nowrap",
        colorClass,
        className
      )}
    >
      {children}
    </span>
  );
}
