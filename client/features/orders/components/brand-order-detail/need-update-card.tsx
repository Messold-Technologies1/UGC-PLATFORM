"use client";

import { ShieldQuestion } from "lucide-react";
import { Button } from "@/components/ui/button";

export function NeedUpdateCard() {
  return (
    <div className="rounded-2xl border bg-[#F8FAFC] dark:bg-slate-900/50 p-5 shadow-sm flex items-center justify-between">
      <div className="flex items-start gap-3">
        <div className="mt-0.5">
          <ShieldQuestion className="size-5 text-primary" />
        </div>
        <div>
          <h4 className="text-sm font-bold text-foreground">
            Need to update something?
          </h4>
          <p className="text-xs text-muted-foreground mt-0.5">
            You can request changes in the brief anytime before the content is delivered.
          </p>
        </div>
      </div>
      <Button variant="outline" className="text-primary border-primary/20 hover:bg-primary/5 rounded-xl font-semibold shrink-0">
        Request Change
      </Button>
    </div>
  );
}
