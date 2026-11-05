"use client";

import { Suspense, useState } from "react";
import { Check, ExternalLink, Monitor, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
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

function Studio() {
  const { data: profile, isPending, isError } = useCreatorProfileMeQuery();
  const mutation = usePublicPageTemplateMutation({
    creatorProfileId: profile?.id,
  });

  const savedId = profile?.publicPageTemplate ?? DEFAULT_PUBLIC_PAGE_TEMPLATE_ID;
  const [browsingId, setBrowsingId] = useState<string | null>(null);
  const [device, setDevice] = useState<PreviewDevice>("desktop");

  // Until the creator picks something, show whatever is saved. Reading it
  // straight from the query also means an applied change is reflected without
  // extra local state.
  const selectedId = browsingId ?? savedId;
  const selected = PUBLIC_PAGE_TEMPLATES.find((t) => t.id === selectedId);
  const isSaved = selectedId === savedId;

  const livePath = profile
    ? creatorPublicProfilePathForProfile({
        publicSlug: profile.publicSlug,
        displayName: profile.displayName,
      })
    : null;

  if (isPending) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner className="size-6" />
      </div>
    );
  }

  if (isError || !profile) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6 text-center text-sm text-muted-foreground">
        We couldn&apos;t load your profile. Please refresh and try again.
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-muted/40">
      <header className="shrink-0 border-b border-border bg-background">
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="min-w-0">
            <h1 className="truncate text-base font-semibold">
              Your public page{selected ? ` · ${selected.name}` : ""}
            </h1>
            <p className="truncate text-sm text-muted-foreground">
              {selected?.tagline} This is your real profile, not a sample.
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <div className="flex items-center gap-1 rounded-full bg-muted p-1">
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
            {livePath && (
              <Button variant="outline" asChild>
                <a href={livePath} target="_blank" rel="noopener noreferrer">
                  Live page
                  <ExternalLink className="size-3.5 opacity-60" />
                </a>
              </Button>
            )}
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

        <div className="flex gap-2 overflow-x-auto px-4 pb-3 sm:px-6">
          {PUBLIC_PAGE_TEMPLATES.map((template) => {
            const isSelected = template.id === selectedId;
            const isCurrent = template.id === savedId;
            return (
              <button
                key={template.id}
                type="button"
                onClick={() => setBrowsingId(template.id)}
                aria-pressed={isSelected}
                className={cn(
                  "w-32 shrink-0 overflow-hidden rounded-lg border-2 text-left transition",
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
      </header>

      <div className="flex min-h-0 flex-1 justify-center p-3">
        <iframe
          // Remounting on each change avoids inheriting the previous
          // template's scroll position.
          key={`${selectedId}-${device}`}
          src={`/creator/public-page-preview?template=${selectedId}`}
          title={`${selected?.name ?? "Public page"} preview`}
          className={cn(
            "h-full rounded-xl border border-border bg-white shadow-sm",
            device === "mobile" ? "w-[390px]" : "w-full",
          )}
        />
      </div>
    </div>
  );
}

/**
 * Full-page preview of the creator's public profile, with a design chooser.
 *
 * Opened in a new tab from "Preview Public Profile" on the account page. The
 * frame renders the creator's own profile through the same host component the
 * live route uses, so what they approve here is what a brand sees.
 */
export function PublicPageDesignStudio() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <Spinner className="size-6" />
        </div>
      }
    >
      <Studio />
    </Suspense>
  );
}
