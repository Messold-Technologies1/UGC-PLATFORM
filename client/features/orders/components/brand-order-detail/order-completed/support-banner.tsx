"use client";

import { LifeBuoy } from "lucide-react";
import { Button } from "@/components/ui/button";

export function SupportBanner() {
  return (
    <div className="rounded-xl border bg-[#F8FAFC] dark:bg-slate-900 p-5 mt-4 flex flex-col sm:flex-row items-center justify-between gap-4">
      <div className="flex items-center gap-4">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-indigo-600 dark:bg-indigo-900/50 dark:text-indigo-400">
          <LifeBuoy className="size-5" />
        </div>
        <div>
          <h4 className="text-sm font-bold text-indigo-900 dark:text-indigo-300">
            Need help with something?
          </h4>
          <p className="text-xs text-muted-foreground mt-0.5">
            Our support team is here to help you.
          </p>
        </div>
      </div>
      <Button
        variant="outline"
        className="rounded-lg text-sm font-semibold border-indigo-200 text-indigo-700 hover:bg-indigo-50 dark:border-indigo-800 dark:text-indigo-300 dark:hover:bg-indigo-900/50"
      >
        Contact Support
      </Button>
    </div>
  );
}
