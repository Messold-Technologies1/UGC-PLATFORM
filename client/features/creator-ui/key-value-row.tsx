import { cn } from "@/lib/utils";
import { type ReactNode } from "react";

interface KeyValueRowProps {
  label: string;
  value: ReactNode;
  /** Adds a top border + bolder styling — use for totals/summaries */
  emphasized?: boolean;
  className?: string;
}

export function KeyValueRow({
  label,
  value,
  emphasized,
  className,
}: KeyValueRowProps) {
  return (
    <div
      className={cn(
        "flex justify-between items-start text-sm",
        emphasized && "border-t border-border pt-2 mt-1",
        className
      )}
    >
      <span
        className={cn(
          "text-muted-foreground",
          emphasized && "font-semibold text-foreground"
        )}
      >
        {label}
      </span>
      <span
        className={cn(
          "font-medium text-foreground text-right max-w-[55%]",
          emphasized && "font-bold"
        )}
      >
        {value}
      </span>
    </div>
  );
}
