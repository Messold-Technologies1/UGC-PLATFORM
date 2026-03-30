import { cn } from "@/lib/utils";

const sk = cn(
  "rounded-md bg-muted/65 motion-safe:animate-pulse motion-reduce:opacity-90",
);

/**
 * Mirrors {@link Navbar} chrome (h-17, logo row, desktop actions, mobile controls)
 * to limit layout shift while `useSearchParams` / workspace nav hydrates.
 */
export function NavbarFallback() {
  return (
    <header
      className="sticky top-0 z-50 w-full bg-background/50 backdrop-blur-sm backdrop-saturate-125"
      aria-busy="true"
      aria-label="Loading navigation"
    >
      <div className="mx-auto flex h-17 max-w-site items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-2">
          <div
            className="bg-foreground flex size-8 shrink-0 items-center justify-center rounded-lg"
            aria-hidden
          />
          <div className={cn("h-5 w-22 shrink-0 sm:w-28", sk)} />
        </div>

        <div className="hidden items-center gap-2 md:flex" aria-hidden>
          <div className={cn("size-7 shrink-0 rounded-lg", sk)} />
          <div
            className="flex shrink-0 items-center gap-1 border-l border-border/60 pl-2"
            aria-hidden
          >
            <div className={cn("h-7 w-20 rounded-lg", sk)} />
            <div className={cn("h-7 w-20 rounded-lg", sk)} />
            <div className={cn("size-8 shrink-0 rounded-full", sk)} />
          </div>
        </div>

        <div className="flex items-center gap-1 md:hidden" aria-hidden>
          <div className={cn("size-7 shrink-0 rounded-lg", sk)} />
          <div className={cn("size-7 shrink-0 rounded-lg", sk)} />
        </div>
      </div>
    </header>
  );
}
