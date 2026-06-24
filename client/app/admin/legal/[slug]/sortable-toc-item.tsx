import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { forwardRef } from "react";

interface SortableTocItemProps {
  id: string;
  title: string;
  index: number;
}

export const TocItem = forwardRef<HTMLDivElement, any>(
  ({ title, index, isOverlay, isDragging, style, ...props }, ref) => {
    return (
      <div
        ref={ref}
        style={style}
        {...props}
        className={`flex items-start gap-2 py-1.5 px-2 rounded-md outline-none transition-colors
          ${isOverlay ? "cursor-grabbing bg-background shadow-xl border border-border/50 scale-105 z-50 ring-1 ring-primary/20" : "cursor-grab active:cursor-grabbing hover:bg-muted/50"}
          ${isDragging ? "opacity-30 bg-muted" : ""}
        `}
      >
        <span className="text-sm font-medium text-muted-foreground w-5 shrink-0 text-right pt-0.5">
          {index + 1}.
        </span>
        <p className="text-sm font-medium text-foreground/90 leading-snug pt-0.5" title={title}>
          {title || "Untitled Section"}
        </p>
      </div>
    );
  }
);
TocItem.displayName = "TocItem";

export function SortableTocItem({ id, title, index }: SortableTocItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <TocItem
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      title={title}
      index={index}
      isDragging={isDragging}
    />
  );
}
