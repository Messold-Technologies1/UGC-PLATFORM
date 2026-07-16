"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RotateCcw, Home } from "lucide-react";

/**
 * Root error boundary. Catches errors thrown while rendering any segment
 * (including workspace templates), so a transient failure — e.g. the auth API
 * being briefly unreachable — shows a retry instead of a raw 500 or an
 * unwarranted bounce to the login screen. `reset()` re-renders the segment,
 * which re-runs the server guard against the still-valid session cookies.
 */
export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <div className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-destructive/10">
        <AlertTriangle className="size-6 text-destructive" />
      </div>
      <h2 className="text-lg font-bold">Something went wrong</h2>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">
        We couldn&apos;t load this page. This is usually temporary — please try
        again.
      </p>
      <div className="mt-4 flex gap-2">
        <Button variant="outline" size="sm" className="gap-1.5" onClick={reset}>
          <RotateCcw className="size-3.5" />
          Try again
        </Button>
        <Button asChild variant="ghost" size="sm" className="gap-1.5">
          <Link href="/">
            <Home className="size-3.5" />
            Home
          </Link>
        </Button>
      </div>
    </div>
  );
}
