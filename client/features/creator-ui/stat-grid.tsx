import { cn } from "@/lib/utils";
import { type ReactNode } from "react";

export interface StatItem {
  label: string;
  value: ReactNode;
}

interface StatGridProps {
  items: StatItem[];
  cols?: 2 | 3 | 4;
  className?: string;
}

const COLS_CLASS: Record<2 | 3 | 4, string> = {
  2: "grid-cols-2",
  3: "grid-cols-3",
  4: "grid-cols-4",
};

export function StatGrid({ items, cols = 3, className }: StatGridProps) {
  return (
    <div className={cn("grid gap-2 text-center", COLS_CLASS[cols], className)}>
      {items.map((item, i) => (
        <div
          key={i}
          className="flex flex-col gap-0.5 p-2 rounded-xl bg-muted/30"
        >
          <span className="text-sm font-bold text-foreground">{item.value}</span>
          <span className="text-[10px] text-muted-foreground">{item.label}</span>
        </div>
      ))}
    </div>
  );
}
