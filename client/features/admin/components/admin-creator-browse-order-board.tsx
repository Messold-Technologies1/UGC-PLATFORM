"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { useRouter } from "next/navigation";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Loader2, Search, X, Shuffle } from "lucide-react";
import {
  CreatorCard,
  CreatorCardSkeleton,
} from "@/features/creators/components/creator-card";
import "@/features/creators/components/browse-creators/browse-creators.css";
import "./admin-browse-order-board.css";
import { useAdminBrowseOrderCreatorsQuery } from "@/features/admin/hooks/use-admin-browse-order-creators-query";
import type { Creator } from "@/features/creators/types";
import { useSaveCreatorBrowseOrderMutation } from "@/features/admin/hooks/use-save-creator-browse-order-mutation";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { reshuffleBrowseOrder } from "@/features/admin/api/reshuffle-browse-order";

/** The public list endpoint caps a page at 50. */
const PAGE_SIZE = 50;

/** Stops a wrong `hasNextPage` from spinning the search forever. */
const MAX_SEARCH_PAGES = 100;

function boardCardDomId(creatorId: string): string {
  return `browse-order-card-${creatorId}`;
}

function matchesName(creator: Creator, needle: string): boolean {
  return creator.name.toLowerCase().includes(needle);
}

/**
 * The brand card with two admin-only additions: the creator's name inside the
 * card, and its position in the top-right corner. The name is the one thing a
 * brand card leaves out — brands are shown the opaque public slug — so without
 * it the board is a wall of near-identical cards.
 */
function BoardCard({
  creator,
  position,
  onOpen,
}: {
  creator: Creator;
  position: number;
  onOpen: (creator: Creator) => void;
}) {
  return (
    <div className="relative h-full min-w-0">
      {/* Rides the card's 4px hover lift so the badge stays pinned to its
          corner rather than sliding down it. */}
      <span className="pointer-events-none absolute right-2 top-2 z-30 flex h-6 min-w-6 items-center justify-center rounded-full bg-primary px-1.5 text-[11px] font-bold tabular-nums text-primary-foreground shadow-md transition-transform duration-200 group-hover/card:-translate-y-1">
        {position}
      </span>

      <CreatorCard
        creator={creator}
        index={position - 1}
        onOpen={onOpen}
        isBrand={false}
        showName
      />
    </div>
  );
}

function SortableBoardCard({
  creator,
  position,
  onOpen,
  isMatch,
}: {
  creator: Creator;
  position: number;
  onOpen: (creator: Creator) => void;
  isMatch: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: creator.id });

  return (
    <div
      ref={setNodeRef}
      id={boardCardDomId(creator.id)}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      {...attributes}
      {...listeners}
      className={cn(
        "group/card h-full min-w-0 cursor-grab touch-none rounded-2xl outline-none active:cursor-grabbing",
        "focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
        isMatch && "ring-2 ring-primary ring-offset-2",
        // The original stays in place as a ghost so the gap it leaves reads as
        // the drop target; the DragOverlay carries the card under the cursor.
        isDragging && "opacity-30",
      )}
      aria-label={`${creator.name}, position ${position}. Press space, then use the arrow keys to move this creator.`}
    >
      <BoardCard creator={creator} position={position} onOpen={onOpen} />
    </div>
  );
}

const RESHUFFLE_DATE_FORMAT: Intl.DateTimeFormatOptions = {
  day: "numeric",
  month: "short",
  year: "numeric",
};

function formatReshuffleDate(iso: string | null): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  return Number.isNaN(date.getTime())
    ? null
    : date.toLocaleDateString("en-IN", RESHUFFLE_DATE_FORMAT);
}

/**
 * Says that this order rewrites itself, and when.
 *
 * Without it the board looks like it rearranges on its own every fortnight,
 * and an admin who spent an afternoon dragging it has no way to know their
 * work has a shelf life.
 */
function ReshuffleBanner({
  lastReshuffledAt,
  nextReshuffleAt,
  onDone,
}: {
  lastReshuffledAt: string | null;
  nextReshuffleAt: string | null;
  onDone: () => void;
}) {
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  const last = formatReshuffleDate(lastReshuffledAt);
  const next = formatReshuffleDate(nextReshuffleAt);

  const run = async () => {
    setRunning(true);
    setFailed(false);
    setResult(null);
    try {
      const outcome = await reshuffleBrowseOrder();
      setResult(
        `Reordered ${outcome.ranked} creators` +
          (outcome.pinned ? `, ${outcome.pinned} left pinned` : "") +
          (outcome.newCreators ? `, ${outcome.newCreators} new` : ""),
      );
      onDone();
    } catch {
      setFailed(true);
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-border bg-muted/40 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 text-xs text-muted-foreground">
        <p className="font-semibold text-foreground">
          This order reshuffles itself every fortnight
        </p>
        <p className="mt-0.5">
          Ranked on the last 90 days — completed orders first, then checkouts,
          add-to-carts, wishlist saves and profile views.
          {last ? ` Last run ${last}.` : " Not run yet."}
          {next ? ` Next ${next}.` : ""} Anything you drag until then is yours;
          the next run replaces it.
        </p>
        {result ? (
          <p className="mt-1 font-medium text-foreground">{result}</p>
        ) : null}
        {failed ? (
          <p className="mt-1 font-medium text-destructive">
            Could not reshuffle. Try again.
          </p>
        ) : null}
      </div>

      <Button
        type="button"
        variant="outline"
        size="sm"
        className="shrink-0 gap-1.5"
        disabled={running}
        onClick={() => void run()}
      >
        {running ? (
          <Loader2 className="size-3.5 animate-spin" />
        ) : (
          <Shuffle className="size-3.5" />
        )}
        {running ? "Reshuffling\u2026" : "Reshuffle now"}
      </Button>
    </div>
  );
}

/**
 * Every listed creator, as the card brands see, in the order brands see them —
 * dragged into place. The list comes from the public browse endpoint itself,
 * so the board cannot drift from the real brand view.
 */
export function AdminCreatorBrowseOrderBoard() {
  const router = useRouter();
  const {
    data,
    isLoading,
    isError,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useAdminBrowseOrderCreatorsQuery(PAGE_SIZE);
  const { mutate: saveOrder, isPending: isSaving } =
    useSaveCreatorBrowseOrderMutation();

  const serverCreators = useMemo(() => {
    // Deduped by id: a page fetched after a save reflects the new order while
    // the pages already cached still reflect the old one, so a creator who
    // moved across a page boundary can come back twice. Two cards with the
    // same id would break both the React keys and the sortable ids.
    const seen = new Set<string>();
    return (data?.pages ?? [])
      .flatMap((page) => page.creators)
      .filter((creator) => {
        if (seen.has(creator.id)) return false;
        seen.add(creator.id);
        return true;
      });
  }, [data]);
  const total = data?.pages?.[0]?.total ?? 0;
  const lastReshuffledAt = data?.pages?.[0]?.lastReshuffledAt ?? null;
  const nextReshuffleAt = data?.pages?.[0]?.nextReshuffleAt ?? null;

  // Only the dragged-into order is held locally; the cards themselves still
  // come from the server. Deriving the list (rather than copying it into state
  // and syncing it back in an effect) means a creator listed or unlisted
  // elsewhere shows up without the board snapping out of the order on screen.
  const [localOrder, setLocalOrder] = useState<string[] | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);

  const creators = useMemo(() => {
    if (!localOrder) return serverCreators;
    const byId = new Map(
      serverCreators.map((creator) => [creator.id, creator]),
    );
    const ordered = localOrder
      .map((id) => byId.get(id))
      .filter((creator): creator is Creator => !!creator);
    const placed = new Set(ordered.map((creator) => creator.id));
    return [
      ...ordered,
      ...serverCreators.filter((creator) => !placed.has(creator.id)),
    ];
  }, [serverCreators, localOrder]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      // Cards are clickable (they open the creator), so a plain click must not
      // register as a drag.
      activationConstraint: { distance: 6 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  // Pull the next page in as the end of the board comes into view.
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const loadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) void fetchNextPage();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) loadMore();
      },
      { rootMargin: "600px" },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loadMore]);

  // Search jumps to a creator instead of filtering: a filtered board would let
  // you drop a card at a position that does not exist in the real order.
  const [query, setQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [notFound, setNotFound] = useState(false);
  // The nonce makes searching the same name twice scroll again, which a bare
  // id would not (the value would not change).
  const [match, setMatch] = useState<{ id: string; nonce: number } | null>(
    null,
  );

  useEffect(() => {
    if (!match) return;
    // The card may have only just been rendered by the page the search pulled
    // in, so wait for that paint before measuring where to scroll.
    const frame = requestAnimationFrame(() => {
      document
        .getElementById(boardCardDomId(match.id))
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
    return () => cancelAnimationFrame(frame);
  }, [match]);

  const runSearch = useCallback(
    async (event: FormEvent) => {
      event.preventDefault();
      const needle = query.trim().toLowerCase();
      setNotFound(false);
      if (!needle) {
        setMatch(null);
        return;
      }

      let found = creators.find((creator) => matchesName(creator, needle));

      // Not among the cards on screen — keep pulling pages in until it turns
      // up or the board runs out, so search covers every listed creator and
      // not just the ones scrolled to so far.
      if (!found && hasNextPage) {
        setIsSearching(true);
        try {
          let more = true;
          for (
            let page = 0;
            !found && more && page < MAX_SEARCH_PAGES;
            page++
          ) {
            const result = await fetchNextPage();
            found = (result.data?.pages ?? [])
              .flatMap((item) => item.creators)
              .find((creator) => matchesName(creator, needle));
            more = result.hasNextPage ?? false;
          }
        } finally {
          setIsSearching(false);
        }
      }

      if (found) {
        setMatch({ id: found.id, nonce: Date.now() });
      } else {
        setMatch(null);
        setNotFound(true);
      }
    },
    [query, creators, hasNextPage, fetchNextPage],
  );

  const clearSearch = () => {
    setQuery("");
    setMatch(null);
    setNotFound(false);
  };

  const openCreator = (creator: Creator) => {
    router.push(`/admin/creators/${creator.id}`);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over || active.id === over.id) return;

    const from = creators.findIndex((creator) => creator.id === active.id);
    const to = creators.findIndex((creator) => creator.id === over.id);
    if (from === -1 || to === -1) return;

    const next = arrayMove(creators, from, to);
    setLocalOrder(next.map((creator) => creator.id));
    // Only the run from the first card through the furthest position the move
    // touched needs saving. Leaving the tail alone is what keeps a freshly
    // listed creator surfacing right behind the arranged cards rather than
    // behind every one of them.
    const touchedThrough = Math.max(from, to);
    saveOrder(next.slice(0, touchedThrough + 1).map((creator) => creator.id));
  };

  const activeCreator = activeId
    ? creators.find((creator) => creator.id === activeId)
    : null;
  const activePosition = activeCreator
    ? creators.indexOf(activeCreator) + 1
    : 1;

  if (isLoading) {
    return (
      <div className="reelgrid browse-redesign-scope">
        {Array.from({ length: 10 }, (_, index) => (
          <div key={index} className="min-w-0 h-full">
            <CreatorCardSkeleton appearance="browse" />
          </div>
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="glass-panel rounded-2xl border border-border/10 bg-card/10 py-20 text-center text-sm text-muted-foreground">
        We could not load the creators right now.{" "}
        <button
          type="button"
          onClick={() => void refetch()}
          className="font-semibold text-primary underline underline-offset-2"
        >
          Try again
        </button>
      </div>
    );
  }

  if (creators.length === 0) {
    return (
      <div className="glass-panel rounded-2xl border border-border/10 bg-card/10 py-20 text-center text-sm text-muted-foreground">
        No listed creators yet. Once a creator is listed they appear here, and
        you can drag them into the order brands see.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <ReshuffleBanner
        lastReshuffledAt={lastReshuffledAt}
        nextReshuffleAt={nextReshuffleAt}
        onDone={() => void refetch()}
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-muted-foreground">
          Every listed creator, in the order brands and agencies see them on
          Browse creators. Drag a card to move it — the new order saves itself.
        </p>

        <div className="flex w-full items-center gap-3 sm:w-auto sm:shrink-0">
          {isSaving ? (
            <span className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
              <Loader2 className="size-3.5 animate-spin" />
              Saving order…
            </span>
          ) : null}

          <form
            onSubmit={runSearch}
            className="relative w-full sm:w-96 lg:w-[28rem]"
          >
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setNotFound(false);
              }}
              placeholder="Jump to a creator by name"
              aria-label="Jump to a creator by name"
              className="h-9 w-full rounded-full border border-border bg-background pl-9 pr-9 text-sm outline-none focus:border-primary"
            />
            {isSearching ? (
              <Loader2 className="absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
            ) : query ? (
              <button
                type="button"
                onClick={clearSearch}
                aria-label="Clear search"
                className="absolute right-2 top-1/2 flex size-6 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground hover:bg-muted"
              >
                <X className="size-3.5" />
              </button>
            ) : null}
          </form>
        </div>
      </div>

      {notFound ? (
        <p className="text-xs font-medium text-destructive">
          No listed creator matches “{query.trim()}”.
        </p>
      ) : null}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={(event: DragStartEvent) =>
          setActiveId(String(event.active.id))
        }
        onDragEnd={handleDragEnd}
        onDragCancel={() => setActiveId(null)}
      >
        <SortableContext
          items={creators.map((creator) => creator.id)}
          strategy={rectSortingStrategy}
        >
          <div className="reelgrid browse-redesign-scope browse-order-board">
            {creators.map((creator, index) => (
              <SortableBoardCard
                key={creator.id}
                creator={creator}
                position={index + 1}
                onOpen={openCreator}
                isMatch={match?.id === creator.id}
              />
            ))}
          </div>
        </SortableContext>

        <DragOverlay>
          {activeCreator ? (
            <div className="browse-redesign-scope browse-order-board w-full cursor-grabbing">
              <BoardCard
                creator={activeCreator}
                position={activePosition}
                onOpen={() => {}}
              />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      <div
        ref={sentinelRef}
        className="flex min-h-12 items-center justify-center pt-2"
      >
        {isFetchingNextPage ? (
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Loader2 className="size-3.5 animate-spin" />
            Loading more…
          </span>
        ) : hasNextPage ? (
          <Button variant="ghost" size="sm" onClick={loadMore}>
            Load more ({creators.length} of {total})
          </Button>
        ) : (
          <span className="text-xs text-muted-foreground">
            All {creators.length} listed creators
          </span>
        )}
      </div>
    </div>
  );
}
