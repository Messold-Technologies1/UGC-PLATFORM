"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RotateCcw, ArrowLeft } from "lucide-react";

export default function CreatorError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <div className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-destructive/10">
        <AlertTriangle className="size-6 text-destructive" />
      </div>
      <h2 className="text-lg font-bold">Something went wrong</h2>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">
        An unexpected error occurred in the creator workspace.
      </p>
      <div className="mt-4 flex gap-2">
        <Button variant="outline" size="sm" className="gap-1.5" onClick={reset}>
          <RotateCcw className="size-3.5" />
          Try again
        </Button>
        <Button asChild variant="ghost" size="sm" className="gap-1.5">
          <Link href="/creator/orders">
            <ArrowLeft className="size-3.5" />
            Orders
          </Link>
        </Button>
      </div>
    </div>
  );
}
