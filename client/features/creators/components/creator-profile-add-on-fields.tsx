"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type AddOnDraft = {
  id: string;
  name: string;
  priceAmount: string;
  description: string;
  existingName?: string | null;
};

export function CreatorProfileAddOnFields({
  rows,
  inputClassName,
  maxAddOns,
  layout = "stack",
  onAdd,
  onRemove,
  onChange,
}: {
  rows: AddOnDraft[];
  inputClassName: string;
  maxAddOns: number;
  layout?: "stack" | "grid";
  onAdd: () => void;
  onRemove: (id: string) => void;
  onChange: (id: string, patch: Partial<Omit<AddOnDraft, "id">>) => void;
}) {
  return (
    <div className="space-y-3 rounded-xl border border-border bg-muted/20 p-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-sm font-medium text-foreground">Add-ons</p>
          <p className="text-xs text-muted-foreground">
            Optional extras brands can add to a package.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="shrink-0"
          disabled={rows.length >= maxAddOns}
          onClick={onAdd}
        >
          Add add-on
        </Button>
      </div>

      {rows.length > 0 ? (
        <div
          className={
            layout === "grid" ? "grid gap-4 xl:grid-cols-3" : "space-y-4"
          }
        >
          {rows.map((row, index) => (
            <div
              key={row.id}
              className="flex flex-col gap-3 rounded-lg border border-border/80 bg-background/60 p-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Add-on {index + 1}
                </p>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 text-muted-foreground hover:text-destructive"
                  onClick={() => onRemove(row.id)}
                >
                  Remove
                </Button>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor={`addon-name-${row.id}`}>Name</Label>
                  <Input
                    id={`addon-name-${row.id}`}
                    className={inputClassName}
                    value={row.name}
                    onChange={(event) =>
                      onChange(row.id, { name: event.target.value })
                    }
                    placeholder="Script writing"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`addon-price-${row.id}`}>Price</Label>
                  <Input
                    id={`addon-price-${row.id}`}
                    className={inputClassName}
                    value={row.priceAmount}
                    onChange={(event) =>
                      onChange(row.id, { priceAmount: event.target.value })
                    }
                    placeholder="499.00"
                    inputMode="decimal"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor={`addon-description-${row.id}`}>
                  Description
                </Label>
                <textarea
                  id={`addon-description-${row.id}`}
                  value={row.description}
                  onChange={(event) =>
                    onChange(row.id, {
                      description: event.target.value,
                    })
                  }
                  rows={3}
                  placeholder="Optional note about what this extra includes"
                  className="border-input focus-visible:border-ring focus-visible:ring-ring/50 w-full resize-y rounded-lg border bg-transparent px-2.5 py-2 text-sm outline-none focus-visible:ring-3 dark:bg-input/30"
                />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="rounded-lg border border-dashed border-border/80 bg-background/40 px-3 py-4 text-sm text-muted-foreground">
          No add-ons added yet.
        </p>
      )}
    </div>
  );
}
