import { cn } from "@/lib/utils";
import { type ReactNode } from "react";

interface SectionCardProps {
  title?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function SectionCard({
  title,
  action,
  children,
  className,
}: SectionCardProps) {
  return (
    <div className={cn("rounded-xl border border-border bg-card p-4", className)}>
      {(title || action) && (
        <div className="flex items-center justify-between mb-3">
          {title && (
            <h3 className="text-sm font-bold text-foreground">{title}</h3>
          )}
          {action}
        </div>
      )}
      {children}
    </div>
  );
}
