"use client";

import { useState } from "react";
import { Check, ExternalLink, Monitor, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import { usePublicPageTemplateMutation } from "../../hooks/use-public-page-template-mutation";
import {
  DEFAULT_PUBLIC_PAGE_TEMPLATE_ID,
  PUBLIC_PAGE_TEMPLATES,
} from "../public-creator-profile/templates/registry";

type PublicPageDesignDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  creatorProfileId: string | undefined;
  /** The creator's saved design; the dialog opens showing this one. */
  currentTemplateId: string | null | undefined;
  /** Path to the live public profile, for the "open in a new tab" link. */
  publicProfilePath: string | null;
};

type PreviewDevice = "desktop" | "mobile";

/**
 * Preview the public profile and switch its design in one place.
 *
 * Reached from "Preview Public Profile" on the account page, which is where
 * creators look for this — the creator settings hub is not linked from the
 * dashboard navigation.
 *
 * The frame renders the creator's own profile through the same host component
 * the live route uses, so what they approve here is what a brand sees.
 */
export function PublicPageDesignDialog({
  open,
  onOpenChange,
  creatorProfileId,
  currentTemplateId,
  publicProfilePath,
}: PublicPageDesignDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* Mounted only while open, so each visit starts from the saved design
          rather than one the creator browsed to and abandoned last time. */}
      {open && (
        <DesignDialogBody
          onOpenChange={onOpenChange}
          creatorProfileId={creatorProfileId}
          currentTemplateId={currentTemplateId}
          publicProfilePath={publicProfilePath}
        />
      )}
    </Dialog>
  );
}

function DesignDialogBody({
  onOpenChange,
  creatorProfileId,
  currentTemplateId,
  publicProfilePath,
}: Omit<PublicPageDesignDialogProps, "open">) {
  const savedId = currentTemplateId ?? DEFAULT_PUBLIC_PAGE_TEMPLATE_ID;
  const [selectedId, setSelectedId] = useState(savedId);
  const [device, setDevice] = useState<PreviewDevice>("desktop");

  const mutation = usePublicPageTemplateMutation({ creatorProfileId });

  const selected = PUBLIC_PAGE_TEMPLATES.find((t) => t.id === selectedId);
  const isSaved = selectedId === savedId;

  return (
    <>
      <DialogContent
        // DialogContent defaults to `sm:max-w-sm`; the override has to be at
        // the same breakpoint or tailwind-merge keeps both and the default wins.
        className="flex h-[92vh] w-[95vw] max-w-[min(1400px,95vw)] flex-col gap-3 p-4 sm:max-w-[min(1400px,95vw)] sm:p-5"
      >
        <DialogHeader className="flex-row items-start justify-between gap-3 space-y-0 pr-8">
          <div className="min-w-0">
            <DialogTitle className="text-base">
              Your public page{selected ? ` · ${selected.name}` : ""}
            </DialogTitle>
            <DialogDescription className="text-sm">
              {selected?.tagline} Pick a design below — this is your real
              profile, not a sample.
            </DialogDescription>
          </div>
          <div className="flex shrink-0 items-center gap-1 rounded-full bg-muted p-1">
            {(
              [
                { id: "desktop", icon: Monitor, label: "Desktop" },
                { id: "mobile", icon: Smartphone, label: "Mobile" },
              ] as const
            ).map(({ id, icon: Icon, label }) => (
              <button
                key={id}
                type="button"
                onClick={() => setDevice(id)}
                aria-pressed={device === id}
                aria-label={label}
                className={cn(
                  "flex size-8 items-center justify-center rounded-full transition",
                  device === id
                    ? "bg-background shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className="size-4" />
              </button>
            ))}
          </div>
        </DialogHeader>

        <div className="flex min-h-0 flex-1 justify-center overflow-hidden rounded-xl bg-muted/50 p-2">
          <iframe
            // Remounting on each change avoids inheriting the previous
            // template's scroll position.
            key={`${selectedId}-${device}`}
            src={`/creator/public-page-preview?template=${selectedId}`}
            title={`${selected?.name ?? "Public page"} preview`}
            className={cn(
              "h-full rounded-lg border border-border bg-white",
              device === "mobile" ? "w-[390px]" : "w-full",
            )}
          />
        </div>

        {/* Design rail */}
        <div className="shrink-0">
          <div className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Designs
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {PUBLIC_PAGE_TEMPLATES.map((template) => {
              const isSelected = template.id === selectedId;
              const isCurrent = template.id === savedId;
              return (
                <button
                  key={template.id}
                  type="button"
                  onClick={() => setSelectedId(template.id)}
                  aria-pressed={isSelected}
                  className={cn(
                    "group relative w-32 shrink-0 overflow-hidden rounded-lg border-2 text-left transition",
                    isSelected
                      ? "border-primary"
                      : "border-transparent hover:border-border",
                  )}
                >
                  <span className="block aspect-[4/3] overflow-hidden bg-muted">
                    {/* eslint-disable-next-line @next/next/no-img-element -- static thumbnail */}
                    <img
                      src={`/template-thumbs/${template.id}.webp`}
                      alt=""
                      className="size-full object-cover object-top"
                      loading="lazy"
                      decoding="async"
                    />
                  </span>
                  <span className="flex items-center gap-1 px-2 py-1.5 text-xs font-medium">
                    {template.name}
                    {isCurrent && (
                      <Check className="size-3 text-primary" strokeWidth={3} />
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2">
          {publicProfilePath ? (
            <a
              href={publicProfilePath}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
            >
              Open my live page
              <ExternalLink className="size-3.5" />
            </a>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
            <Button
              disabled={isSaved || mutation.isPending}
              onClick={() => mutation.mutate(selectedId)}
            >
              {mutation.isPending ? (
                <Spinner className="size-4" />
              ) : isSaved ? (
                "In use"
              ) : (
                "Use this design"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </>
  );
}
