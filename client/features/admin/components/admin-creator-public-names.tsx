"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ExternalLink, Loader2, Search } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { setCreatorPublicName } from "@/features/admin/api/set-creator-public-name";
import { CreatorAvatar } from "@/features/admin/components/admin-creator-list-row";
import { getAdminCreatorTabs } from "@/features/admin/constants/admin-creator-tabs";
import { useAdminCreatorsQuery } from "@/features/admin/hooks/use-admin-creators-query";
import { creatorPublicProfileUrl } from "@/features/creators/lib/creator-public-profile-url";
import type {
  AdminCreatorListItemDto,
  AdminCreatorListSegment,
} from "@/features/admin/types";

const PAGE_SIZE = 10;

/**
 * Admin control for showing a creator's real name on their public page.
 *
 * Creators are anonymous by default — the public page shows a niche headline
 * ("Beauty Creator") on an opaque URL. Ticking a creator here puts their own
 * profile name at the top of that page and moves it to a matching URL. It
 * changes the PUBLIC PAGE ONLY: orders, chat and the brand browse drawer keep
 * using the opaque slug either way.
 */
export function AdminCreatorPublicNames() {
  const [segment, setSegment] = useState<AdminCreatorListSegment>("listed");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  // Debounced so typing doesn't fire a request per keystroke.
  useEffect(() => {
    const id = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(id);
  }, [searchInput]);

  const query = useMemo(
    () => ({
      segment,
      page,
      limit: PAGE_SIZE,
      search: search || undefined,
    }),
    [segment, page, search],
  );

  const { data, isLoading, isError } = useAdminCreatorsQuery(query);
  const creators = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const segments = getAdminCreatorTabs().filter(
    (tab) => tab.value !== "featured",
  );

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-border/10 bg-card/10 p-5 glass-panel">
        <h2 className="text-base font-semibold">Public page names</h2>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
          Creators are anonymous by default: their public page shows a niche
          headline on a random URL. Tick a creator and their page shows their
          name and moves to a matching URL. The old link keeps working and
          redirects. Nothing else changes — orders, chat and the brand browse
          list stay anonymous.
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="Search creators by name, email, phone or slug"
            className="pl-9"
          />
        </div>
        <Select
          value={segment}
          onValueChange={(next) => {
            setSegment(next as AdminCreatorListSegment);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-full sm:w-56">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {segments.map((tab) => (
              <SelectItem key={tab.value} value={tab.value}>
                {tab.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isError ? (
        <div className="rounded-2xl border border-border/10 bg-card/10 py-16 text-center text-sm text-muted-foreground glass-panel">
          We could not load creators right now. Try again shortly.
        </div>
      ) : isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-20 w-full rounded-2xl" />
          ))}
        </div>
      ) : creators.length === 0 ? (
        <div className="rounded-2xl border border-border/10 bg-card/10 py-16 text-center text-sm text-muted-foreground glass-panel">
          {search
            ? "No creators match your search."
            : "No creators in this stage yet."}
        </div>
      ) : (
        <div className="space-y-3">
          {creators.map((creator) => (
            <PublicNameRow key={creator.id} creator={creator} />
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Page {page} of {totalPages} · {total} creators
          </span>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
            >
              Previous
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() =>
                setPage((current) => Math.min(totalPages, current + 1))
              }
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function PublicNameRow({ creator }: { creator: AdminCreatorListItemDto }) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (reveal: boolean) => setCreatorPublicName(creator.id, reveal),
    onSuccess: (result) => {
      if (!result.publicNameRevealed) {
        toast.success(`${creator.displayName}'s page is anonymous again`);
      } else if (result.publicNameShared) {
        // The plain name URL was taken by another creator with the same name,
        // so this one fell to a suffix. Say so rather than leaving the admin
        // to spot the "-2".
        toast.success(
          `Shown — that name URL was taken, so this page is at /${result.canonicalSlug}`,
        );
      } else {
        toast.success(`Now showing on the public page at /${result.canonicalSlug}`);
      }
      void queryClient.invalidateQueries({ queryKey: ["admin", "creators"] });
    },
    onError: () => {
      toast.error("Could not change that. Try again.");
    },
  });

  // While the request is in flight, show what was asked for rather than the
  // stale list value — no local state, so nothing to keep in step afterwards.
  const revealed = mutation.isPending
    ? (mutation.variables ?? false)
    : !!creator.publicNameRevealed;

  const canonicalSlug = creator.publicNameSlug ?? creator.publicSlug;
  const publicUrl = canonicalSlug
    ? creatorPublicProfileUrl(canonicalSlug)
    : null;
  const checkboxId = `reveal-name-${creator.id}`;

  return (
    <div className="rounded-2xl border border-border/10 bg-card/10 p-4 glass-panel">
      <div className="flex items-center gap-3 sm:gap-4">
        <div className="flex size-5 shrink-0 items-center justify-center self-center">
          {mutation.isPending ? (
            <Loader2 className="size-4 animate-spin text-muted-foreground" />
          ) : (
            <Checkbox
              id={checkboxId}
              checked={revealed}
              onCheckedChange={(next) => mutation.mutate(next === true)}
            />
          )}
        </div>

        <CreatorAvatar creator={creator} size="sm" />

        <div className="min-w-0 flex-1">
          <label
            htmlFor={checkboxId}
            className="cursor-pointer text-sm font-semibold"
          >
            {creator.displayName}
          </label>
          <div className="mt-0.5 truncate text-xs text-muted-foreground">
            {creator.city ?? "—"}
            {creator.instagramUsername ? ` · @${creator.instagramUsername}` : ""}
            {/*
              The opaque id is the one value that stays unique per creator once
              a name is shown, so two creators with the same real name are
              still tellable apart in this list.
            */}
            {` · id `}
            <span className="font-mono">{creator.publicSlug}</span>
          </div>
        </div>

        <div className="shrink-0 self-center text-right">
          {revealed && publicUrl ? (
            <a
              href={publicUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
            >
              <ExternalLink className="size-3 shrink-0" />
              <span>/{canonicalSlug}</span>
            </a>
          ) : (
            <span className="text-xs text-muted-foreground">
              Anonymous · /{creator.publicSlug}
            </span>
          )}
        </div>
      </div>

      {/*
        Stated as a fact about the URL, not about the other creator: they may
        since have been un-ticked, but this page keeps the URL it was given.
      */}
      {revealed && creator.publicNameShared && (
        <p className="mt-2 pl-[4.25rem] text-xs text-amber-700">
          Another creator shares this name, so the plain name URL was taken and
          this page is at <span className="font-medium">/{canonicalSlug}</span>.
        </p>
      )}
    </div>
  );
}
