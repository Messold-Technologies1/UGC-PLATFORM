import { memo } from "react";
import { Play, Eye } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { PortfolioItem } from "../types";

interface PortfolioTabProps {
  items: PortfolioItem[];
}

export const PortfolioTab = memo(function PortfolioTab({ items }: PortfolioTabProps) {
  if (items.length === 0) {
    return (
      <div className="flex min-h-[200px] items-center justify-center rounded-2xl border border-dashed border-border/80 bg-card">
        <p className="text-sm text-muted-foreground">No portfolio items yet</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          className="group relative cursor-pointer overflow-hidden rounded-xl border border-border bg-card text-left transition-shadow hover:shadow-lg hover:shadow-primary/5"
        >
          <div className="relative aspect-9/16 max-h-72 overflow-hidden bg-linear-to-br from-muted via-muted to-muted/80">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="flex size-11 items-center justify-center rounded-full bg-background/80 shadow-lg backdrop-blur-sm transition-transform group-hover:scale-110" aria-label="Play video">
                <Play className="size-4 text-foreground ml-0.5" aria-hidden="true" />
              </div>
            </div>

            <Badge
              variant="secondary"
              className="absolute left-2.5 top-2.5 text-xs bg-background/80 backdrop-blur-sm"
            >
              {item.category}
            </Badge>
          </div>

          <div className="p-3">
            <h4 className="truncate text-sm font-medium">{item.title}</h4>
            <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
              <Eye className="size-3" aria-hidden="true" />
              {item.views.toLocaleString()} views
            </p>
          </div>
        </button>
      ))}
    </div>
  );
});
