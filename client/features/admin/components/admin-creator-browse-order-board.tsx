"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { GripVertical, Loader2 } from "lucide-react";
import {
  CreatorCard,
  CreatorCardSkeleton,
} from "@/features/creators/components/creator-card";
import "@/features/creators/components/browse-creators/browse-creators.css";
import { useInfiniteCreatorsListQuery } from "@/features/creators/hooks/use-creators-list-query";
import type { Creator } from "@/features/creators/types";
import { useSaveCreatorBrowseOrderMutation } from "@/features/admin/hooks/use-save-creator-browse-order-mutation";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** The public list endpoint caps a page at 50. */
const PAGE_SIZE = 50;

/** The card plus its drag affordances — the position badge and the grip. */
function BoardCard({
  creator,
  position,
  onOpen,
  isOverlay = false,
}: {
  creator: Creator;
  position: number;
  onOpen: (creator: Creator) => void;
  isOverlay?: boolean;
}) {
  return (
    <div className="relative h-full min-w-0">
      <div className="pointer-events-none absolute left-2 top-2 z-30 flex items-center gap-1.5">
        <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-primary px-1.5 text-[11px] font-bold text-primary-foreground shadow-md">
          {position}
        </span>
        <span
          className={cn(
            "flex h-6 w-6 items-center justify-center rounded-full bg-black/55 text-white shadow-md backdrop-blur-sm transition-opacity",
            isOverlay ? "opacity-100" : "opacity-0 group-hover/card:opacity-100",
          )}
        >
          <GripVertical className="size-3.5" />
        </span>
      </div>

      <CreatorCard
        creator={creator}
        index={position - 1}
        onOpen={onOpen}
        isBrand={false}
      />
    </div>
  );
}

function SortableBoardCard({
  creator,
  position,
  onOpen,
}: {
  creator: Creator;
  position: number;
  onOpen: (creator: Creator) => void;
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
      style={{ transform: CSS.Transform.toString(transform), transition }}
      {...attributes}
      {...listeners}
      className={cn(
        "group/card h-full min-w-0 cursor-grab touch-none outline-none active:cursor-grabbing",
        "focus-visible:rounded-2xl focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
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
  } = useInfiniteCreatorsListQuery({ filters: { limit: PAGE_SIZE } });
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

  // Only the dragged-into order is held locally; the cards themselves still
  // come from the server. Deriving the list (rather than copying it into state
  // and syncing it back in an effect) means a creator listed or unlisted
  // elsewhere shows up without the board snapping out of the order on screen.
  const [localOrder, setLocalOrder] = useState<string[] | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);

  const creators = useMemo(() => {
    if (!localOrder) return serverCreators;
    const byId = new Map(serverCreators.map((creator) => [creator.id, creator]));
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
  const activePosition = activeCreator ? creators.indexOf(activeCreator) + 1 : 1;

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
      <div className="flex items-center justify-between gap-4">
        <p className="text-xs text-muted-foreground">
          Every listed creator, in the order brands and agencies see them on
          Browse creators. Drag a card to move it — the new order saves itself.
        </p>
        {isSaving ? (
          <span className="flex shrink-0 items-center gap-1.5 text-xs font-semibold text-muted-foreground">
            <Loader2 className="size-3.5 animate-spin" />
            Saving order…
          </span>
        ) : null}
      </div>

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
          <div className="reelgrid browse-redesign-scope">
            {creators.map((creator, index) => (
              <SortableBoardCard
                key={creator.id}
                creator={creator}
                position={index + 1}
                onOpen={openCreator}
              />
            ))}
          </div>
        </SortableContext>

        <DragOverlay>
          {activeCreator ? (
            <div className="browse-redesign-scope w-full cursor-grabbing">
              <BoardCard
                creator={activeCreator}
                position={activePosition}
                onOpen={() => {}}
                isOverlay
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
