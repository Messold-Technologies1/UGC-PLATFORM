"use client";

import { ExternalLink, MessageCircle, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";

export function QuickActionsCard() {
  return (
    <div className="rounded-lg border bg-card p-6 shadow-sm flex flex-col h-full">
      <h3 className="text-lg font-bold text-foreground mb-6">Quick Actions</h3>
      <div className="flex flex-col gap-3 mt-auto">
        <Button
          variant="outline"
          className="justify-start gap-3 h-11 px-4 text-sm font-semibold rounded-xl hover:bg-muted/50 w-full"
        >
          <ExternalLink className="size-4 text-muted-foreground shrink-0" />
          <span className="truncate text-foreground">Share Reference</span>
        </Button>
        <Button
          variant="outline"
          className="justify-start gap-3 h-11 px-4 text-sm font-semibold rounded-xl hover:bg-muted/50 w-full"
        >
          <Upload className="size-4 text-muted-foreground shrink-0" />
          <span className="truncate text-foreground">Upload File</span>
        </Button>
        <Button
          variant="outline"
          className="justify-start gap-3 h-11 px-4 text-sm font-semibold rounded-xl hover:bg-muted/50 w-full"
        >
          <MessageCircle className="size-4 text-muted-foreground shrink-0" />
          <span className="truncate text-foreground">Request Update</span>
        </Button>
      </div>
    </div>
  );
}
