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
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import { useCreatorProfileMeQuery } from "../../hooks/use-creator-profile-me-query";
import { usePublicPageTemplateMutation } from "../../hooks/use-public-page-template-mutation";
import { creatorPublicProfilePathForProfile } from "../../lib/creator-public-profile-url";
import {
  DEFAULT_PUBLIC_PAGE_TEMPLATE_ID,
  PUBLIC_PAGE_TEMPLATES,
} from "../public-creator-profile/templates/registry";

type PreviewDevice = "desktop" | "mobile";

export function PublicPageTemplatePicker() {
  const { data: profile, isPending } = useCreatorProfileMeQuery();
  const mutation = usePublicPageTemplateMutation({
    creatorProfileId: profile?.id,
  });

  const [previewId, setPreviewId] = useState<string | null>(null);
  const [device, setDevice] = useState<PreviewDevice>("desktop");

  const currentId =
    profile?.publicPageTemplate ?? DEFAULT_PUBLIC_PAGE_TEMPLATE_ID;
  const previewTemplate = PUBLIC_PAGE_TEMPLATES.find(
    (template) => template.id === previewId,
  );
  const livePath = profile
    ? creatorPublicProfilePathForProfile({
        publicSlug: profile.publicSlug,
        displayName: profile.displayName,
      })
    : null;

  if (isPending) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {PUBLIC_PAGE_TEMPLATES.map((template) => (
          <Skeleton key={template.id} className="h-72 rounded-2xl" />
        ))}
      </div>
    );
  }

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {PUBLIC_PAGE_TEMPLATES.map((template) => {
          const isCurrent = template.id === currentId;
          const isSaving =
            mutation.isPending && mutation.variables === template.id;

          return (
            <div
              key={template.id}
              className={cn(
                "flex flex-col overflow-hidden rounded-2xl border bg-card transition-shadow",
                isCurrent
                  ? "border-primary ring-1 ring-primary"
                  : "border-border hover:shadow-lg hover:shadow-primary/5",
              )}
            >
              <button
                type="button"
                onClick={() => setPreviewId(template.id)}
                className="group relative block aspect-[4/3] w-full overflow-hidden bg-muted"
                aria-label={`Preview the ${template.name} design`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- static thumbnail */}
                <img
                  src={`/template-thumbs/${template.id}.webp`}
                  alt=""
                  className="size-full object-cover object-top transition-transform duration-500 group-hover:scale-[1.03]"
                  loading="lazy"
                  decoding="async"
                />
                <span className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition group-hover:bg-black/30 group-hover:opacity-100">
                  <span className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-neutral-900">
                    Preview
                  </span>
                </span>
                {isCurrent && (
                  <span className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
                    <Check className="size-3" strokeWidth={3} />
                    Current
                  </span>
                )}
              </button>

              <div className="flex flex-1 flex-col gap-3 p-4">
                <div>
                  <h3 className="text-sm font-semibold">{template.name}</h3>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    {template.tagline}
                  </p>
                </div>
                <div className="mt-auto flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => setPreviewId(template.id)}
                  >
                    Preview
                  </Button>
                  <Button
                    size="sm"
                    className="flex-1"
                    disabled={isCurrent || mutation.isPending}
                    onClick={() => mutation.mutate(template.id)}
                  >
                    {isSaving ? (
                      <Spinner className="size-4" />
                    ) : isCurrent ? (
                      "In use"
                    ) : (
                      "Use this design"
                    )}
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <Dialog
        open={previewId !== null}
        onOpenChange={(open) => !open && setPreviewId(null)}
      >
        <DialogContent
          // DialogContent defaults to `sm:max-w-sm`; the override has to be at
          // the same breakpoint or tailwind-merge keeps both and the default wins.
          className="flex h-[92vh] w-[95vw] max-w-[min(1400px,95vw)] flex-col gap-3 p-4 sm:max-w-[min(1400px,95vw)] sm:p-5"
        >
          <DialogHeader className="flex-row items-center justify-between gap-3 space-y-0 pr-8">
            <div className="min-w-0">
              <DialogTitle className="text-base">
                {previewTemplate?.name}
              </DialogTitle>
              <DialogDescription className="text-sm">
                {previewTemplate?.tagline} This is your real profile, not a
                sample.
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
            {previewId && (
              <iframe
                // Remounting on each change guarantees a clean render rather
                // than a stale scroll position from the previous template.
                key={`${previewId}-${device}`}
                src={`/creator/public-page-preview?template=${previewId}`}
                title={`${previewTemplate?.name} preview`}
                className={cn(
                  "h-full rounded-lg border border-border bg-white",
                  device === "mobile" ? "w-[390px]" : "w-full",
                )}
              />
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            {livePath ? (
              <a
                href={livePath}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
              >
                Open my live page
                <ExternalLink className="size-3.5" />
              </a>
            ) : (
              <span />
            )}
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setPreviewId(null)}>
                Close
              </Button>
              <Button
                disabled={previewId === currentId || mutation.isPending}
                onClick={() => {
                  if (!previewId) return;
                  mutation.mutate(previewId, {
                    onSuccess: () => setPreviewId(null),
                  });
                }}
              >
                {previewId === currentId ? "In use" : "Use this design"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
