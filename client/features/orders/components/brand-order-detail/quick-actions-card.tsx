"use client";

import { AlertTriangle, Clock, Link as LinkIcon, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";

export function QuickActionsCard() {
  return (
    <div className="rounded-lg border bg-card p-6 shadow-sm">
      <h3 className="text-lg font-bold text-foreground mb-4">Quick Actions</h3>
      <div className="grid grid-cols-2 gap-3">
        <Button
          variant="outline"
          className="justify-start gap-2 h-11 px-4 text-sm font-medium rounded-xl hover:bg-muted/50"
        >
          <LinkIcon className="size-4 text-muted-foreground shrink-0" />
          <span className="truncate">Share Reference</span>
        </Button>
        <Button
          variant="outline"
          className="justify-start gap-2 h-11 px-4 text-sm font-medium rounded-xl hover:bg-muted/50"
        >
          <Upload className="size-4 text-muted-foreground shrink-0" />
          <span className="truncate">Upload File</span>
        </Button>
        <Button
          variant="outline"
          className="justify-start gap-2 h-11 px-4 text-sm font-medium rounded-xl hover:bg-muted/50"
        >
          <Clock className="size-4 text-muted-foreground shrink-0" />
          <span className="truncate">Request Update</span>
        </Button>
        <Button
          variant="outline"
          className="justify-start gap-2 h-11 px-4 text-sm font-medium rounded-xl text-destructive hover:text-destructive hover:bg-destructive/5 border-destructive/20"
        >
          <AlertTriangle className="size-4 shrink-0" />
          <span className="truncate">Report an Issue</span>
        </Button>
      </div>
    </div>
  );
}
