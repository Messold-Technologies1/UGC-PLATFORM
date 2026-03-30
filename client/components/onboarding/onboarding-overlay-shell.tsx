"use client";

import * as React from "react";
import { Dialog as DialogPrimitive } from "radix-ui";
import { cn } from "@/lib/utils";

export type OnboardingOverlayShellProps = {
  open: boolean;
  onOpenChange?: (open: boolean) => void;
  dismissible?: boolean;
  srTitle: string;
  srDescription: string;
  left: React.ReactNode;
  right: React.ReactNode;
  className?: string;
  
  contentVariant?: "compact" | "scrollable";
};

export function OnboardingOverlayShell({
  open,
  onOpenChange,
  dismissible = false,
  srTitle,
  srDescription,
  left,
  right,
  className,
  contentVariant = "compact",
}: OnboardingOverlayShellProps) {
  const contentRef = React.useRef<HTMLDivElement>(null);

  const handleInteractOutside = React.useCallback(
    (e: Event) => {
      if (!dismissible) e.preventDefault();
    },
    [dismissible],
  );

  const handleEscape = React.useCallback(
    (e: KeyboardEvent) => {
      if (!dismissible) e.preventDefault();
    },
    [dismissible],
  );

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange} modal>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/50 backdrop-blur-[2px]" />
        <DialogPrimitive.Content
          ref={contentRef}
          tabIndex={-1}
          onOpenAutoFocus={(e) => {
            e.preventDefault();
            queueMicrotask(() => contentRef.current?.focus());
          }}
          onPointerDownOutside={handleInteractOutside}
          onEscapeKeyDown={handleEscape}
          className={cn(
            "fixed top-[50%] left-[50%] z-50 w-[calc(100%-1.5rem)] max-w-[min(100%,52rem)] max-h-[calc(100dvh-2rem)] translate-x-[-50%] translate-y-[-50%]",
            "overflow-hidden rounded-2xl border border-border bg-background shadow-lg outline-none",
            className,
          )}
        >
          <DialogPrimitive.Title className="sr-only">
            {srTitle}
          </DialogPrimitive.Title>
          <DialogPrimitive.Description className="sr-only">
            {srDescription}
          </DialogPrimitive.Description>

          <div
            className={cn(
              "grid min-h-0 max-h-[inherit] md:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]",
              contentVariant === "compact"
                ? "md:max-h-[min(100dvh-2rem,36rem)]"
                : "md:max-h-[min(100dvh-2rem,90dvh)]",
            )}
          >
            {left}
            {right}
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
