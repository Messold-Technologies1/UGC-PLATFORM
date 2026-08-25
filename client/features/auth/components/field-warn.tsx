import { AlertTriangle } from "lucide-react";
import type { ReactNode } from "react";

/** Same inline warning used on edit-profile wizard fields. */
export function FieldWarn({ children }: { children: ReactNode }) {
  if (!children) return null;
  return (
    <p className="mt-1 flex items-start gap-[7px] rounded-lg border border-amber-500/35 bg-amber-500/10 px-[11px] py-2 text-xs font-medium leading-[1.45] text-amber-800 dark:text-amber-200">
      <AlertTriangle
        size={13}
        className="mt-px shrink-0 text-amber-600"
        aria-hidden
      />
      {children}
    </p>
  );
}
