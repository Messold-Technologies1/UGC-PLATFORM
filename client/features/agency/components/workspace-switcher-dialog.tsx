"use client";

import { useMemo, useState } from "react";
import { Building2, Check, Search, Sparkles } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { useAgencyBrandLinksQuery } from "@/features/agency/hooks/use-agency-brand-links";
import { useActiveBrand } from "@/providers/active-brand-provider";

/**
 * Picking the workspace an agency is working in.
 *
 * "My Agency" is the agency's own account — the direct mode, where the agency
 * owns its orders and briefs. Picking a brand instead puts every subsequent
 * request into that brand's workspace, where the BRAND owns everything and the
 * agency is only recorded as the actor.
 *
 * Only brands with an ACTIVE link are listed. A pending request is not a
 * workspace anyone can enter, so offering it here would be an invitation to a
 * 403.
 */

type Row = {
  /** Null is the agency's own workspace. */
  id: string | null;
  name: string;
  hint: string;
};

export function WorkspaceSwitcherDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { activeBrandProfileId, switchToBrand } = useActiveBrand();
  // No point holding the list for a dialog nobody has opened; it is also how
  // the list refreshes after a brand is accepted or dropped.
  const links = useAgencyBrandLinksQuery({ enabled: open });
  const [query, setQuery] = useState("");

  const rows = useMemo<Row[]>(() => {
    const managed = (links.data ?? [])
      .filter((link) => link.status === "ACTIVE")
      .map<Row>((link) => ({
        id: link.brandId,
        name: link.brandName ?? "Unnamed brand",
        hint: "Work inside this brand's account",
      }));

    return [
      {
        id: null,
        name: "My Agency",
        hint: "Your own account — orders and briefs you own",
      },
      ...managed,
    ];
  }, [links.data]);

  const needle = query.trim().toLowerCase();
  const visible = needle
    ? rows.filter((row) => row.name.toLowerCase().includes(needle))
    : rows;

  function choose(row: Row) {
    switchToBrand(row.id);
    onOpenChange(false);
    setQuery("");
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        // A stale search term would silently hide most of the list the next
        // time the dialog is opened.
        if (!next) setQuery("");
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Switch workspace</DialogTitle>
          <DialogDescription>
            Everything you do — orders, wishlists, briefs — belongs to the
            workspace you pick here.
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search brands"
            aria-label="Search workspaces"
            autoComplete="off"
            className="w-full rounded-xl border border-border bg-background py-2.5 pl-9 pr-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring/40"
          />
        </div>

        <div className="max-h-[min(55vh,320px)] overflow-y-auto">
          {links.isLoading ? (
            <ul className="space-y-1">
              {Array.from({ length: 3 }).map((_, i) => (
                <li key={i} className="flex items-center gap-3 px-2 py-2.5">
                  <div className="size-9 shrink-0 animate-pulse rounded-full bg-muted" />
                  <div className="h-4 w-40 animate-pulse rounded bg-muted" />
                </li>
              ))}
            </ul>
          ) : visible.length === 0 ? (
            <p className="px-2 py-8 text-center text-sm text-muted-foreground">
              No workspace matches “{query.trim()}”.
            </p>
          ) : (
            <ul className="space-y-1">
              {visible.map((row) => {
                const current = row.id === activeBrandProfileId;
                return (
                  <li key={row.id ?? "my-agency"}>
                    <button
                      type="button"
                      onClick={() => choose(row)}
                      aria-current={current ? "true" : undefined}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-xl px-2 py-2.5 text-left transition-colors",
                        current ? "bg-accent/70" : "hover:bg-muted/60",
                      )}
                    >
                      <span
                        className={cn(
                          "flex size-9 shrink-0 items-center justify-center rounded-full",
                          row.id === null
                            ? "bg-primary/10 text-primary"
                            : "bg-muted text-muted-foreground",
                        )}
                        aria-hidden
                      >
                        {row.id === null ? (
                          <Sparkles className="size-4" />
                        ) : (
                          <Building2 className="size-4" />
                        )}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-foreground">
                          {row.name}
                        </span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {row.hint}
                        </span>
                      </span>
                      {current ? (
                        <Check
                          className="size-4 shrink-0 text-primary"
                          aria-label="Current workspace"
                        />
                      ) : null}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/*
          A failed load must not read as "you manage nobody". The agency's own
          workspace is still listed above, so this is a note rather than a
          replacement for the list.
        */}
        {links.isError ? (
          <p className="text-xs text-muted-foreground">
            We couldn&apos;t load the brands you manage. Reload the page to try
            again.
          </p>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
