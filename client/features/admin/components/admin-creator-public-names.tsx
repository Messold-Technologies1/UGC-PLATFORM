"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, ExternalLink, Loader2, Search, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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
import { getAdminCreatorTabs } from "@/features/admin/constants/admin-creator-tabs";
import { useAdminCreatorsQuery } from "@/features/admin/hooks/use-admin-creators-query";
import { creatorPublicProfileUrl } from "@/features/creators/lib/creator-public-profile-url";
import type {
  AdminCreatorListItemDto,
  AdminCreatorListSegment,
} from "@/features/admin/types";

const PAGE_SIZE = 10;

/**
 * Admin control for revealing a creator's real name on their public page.
 *
 * Creators are anonymous by default — the public page shows a niche headline
 * ("Beauty Creator") on an opaque URL. Saving a name here makes it the
 * headline and the URL segment for that creator's PUBLIC PAGE ONLY. Orders,
 * chat and the brand browse drawer keep using the opaque slug either way.
 */
export function AdminCreatorPublicNames() {
  const [segment, setSegment] = useState<AdminCreatorListSegment>("listed");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  // Debounced so typing a name doesn't fire a request per keystroke.
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
          headline on a random URL. Add a name here and that creator&apos;s
          public page shows the name and moves to a matching URL. The old link
          keeps working and redirects. Nothing else changes — orders, chat and
          the brand browse list stay anonymous.
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
            <Skeleton key={index} className="h-24 w-full rounded-2xl" />
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
            // Keyed by the saved name as well as the id: a successful save
            // remounts the row so the field shows what is stored, without an
            // effect fighting the user's typing.
            <PublicNameRow
              key={`${creator.id}:${creator.publicDisplayName ?? ""}`}
              creator={creator}
            />
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
  const saved = creator.publicDisplayName ?? "";
  const [value, setValue] = useState(saved);

  const mutation = useMutation({
    mutationFn: (name: string | null) => setCreatorPublicName(creator.id, name),
    onSuccess: (result) => {
      if (!result.publicDisplayName) {
        toast.success("Public page is anonymous again");
      } else if (result.publicNameShared) {
        // Another creator already has this name, so this page is at
        // /riya-sharma-2. Say so rather than leaving the admin to spot it.
        toast.success(
          `Saved — another creator already uses that name, so this page is at /${result.canonicalSlug}`,
        );
      } else {
        toast.success(
          `Public page now shows "${result.publicDisplayName}" at /${result.canonicalSlug}`,
        );
      }
      void queryClient.invalidateQueries({ queryKey: ["admin", "creators"] });
    },
    onError: () => {
      toast.error("Could not save that name. Try again.");
    },
  });

  const trimmed = value.trim();
  const dirty = trimmed !== saved.trim();
  const canonicalSlug = creator.publicNameSlug ?? creator.publicSlug;
  const publicUrl = canonicalSlug
    ? creatorPublicProfileUrl(canonicalSlug)
    : null;

  return (
    <div className="rounded-2xl border border-border/10 bg-card/10 p-4 glass-panel">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0 lg:w-64">
          <div className="truncate text-sm font-semibold">
            {creator.displayName}
          </div>
          <div className="mt-0.5 truncate text-xs text-muted-foreground">
            {creator.city ?? "—"}
            {creator.instagramUsername ? ` · @${creator.instagramUsername}` : ""}
          </div>
          {/*
            Always shown, even once a name is revealed: it is the one value
            that is unique per creator, so two creators with the same real
            name stay tellable apart in this list.
          */}
          <div className="mt-0.5 truncate font-mono text-[11px] text-muted-foreground/70">
            id {creator.publicSlug}
          </div>
          {publicUrl && (
            <a
              href={publicUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 inline-flex max-w-full items-center gap-1 truncate text-xs text-primary hover:underline"
            >
              <ExternalLink className="size-3 shrink-0" />
              <span className="truncate">/{canonicalSlug}</span>
            </a>
          )}
        </div>

        <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center">
          <Input
            value={value}
            onChange={(event) => setValue(event.target.value)}
            placeholder="Leave empty to stay anonymous"
            maxLength={80}
            disabled={mutation.isPending}
            className="flex-1"
          />
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              disabled={!dirty || mutation.isPending}
              onClick={() => mutation.mutate(trimmed || null)}
            >
              {mutation.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Check className="size-4" />
              )}
              Save
            </Button>
            {saved && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={mutation.isPending}
                onClick={() => {
                  setValue("");
                  mutation.mutate(null);
                }}
              >
                <X className="size-4" />
                Hide name
              </Button>
            )}
          </div>
        </div>
      </div>

      {creator.publicNameShared && (
        <p className="mt-2 text-xs text-amber-700 lg:ml-68">
          Another creator also uses this name, so this page is at{" "}
          <span className="font-medium">/{canonicalSlug}</span>. Both pages
          work and stay separate.
        </p>
      )}
    </div>
  );
}
