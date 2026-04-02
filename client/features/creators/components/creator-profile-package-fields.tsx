"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type PackageDraft = {
  id: string;
  name: string;
  priceAmount: string;
  deliveryDays: string;
  deliverables: string;
};

export function CreatorProfilePackageFields({
  rows,
  inputClassName,
  maxPackages,
  onAdd,
  onRemove,
  onChange,
}: {
  rows: PackageDraft[];
  inputClassName: string;
  maxPackages: number;
  onAdd: () => void;
  onRemove: (id: string) => void;
  onChange: (id: string, patch: Partial<Omit<PackageDraft, "id">>) => void;
}) {
  return (
    <div className="space-y-3 rounded-xl border border-border bg-muted/20 p-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-sm font-medium text-foreground">Packages</p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="shrink-0"
          disabled={rows.length >= maxPackages}
          onClick={onAdd}
        >
          Add package
        </Button>
      </div>

      <div className="space-y-4">
        {rows.map((row, index) => (
          <div
            key={row.id}
            className="space-y-3 rounded-lg border border-border/80 bg-background/60 p-3"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Package {index + 1}
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
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-2 sm:col-span-1">
                <Label htmlFor={`pkg-name-${row.id}`}>Name</Label>
                <Input
                  id={`pkg-name-${row.id}`}
                  className={inputClassName}
                  value={row.name}
                  onChange={(event) =>
                    onChange(row.id, { name: event.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`pkg-price-${row.id}`}>Price</Label>
                <Input
                  id={`pkg-price-${row.id}`}
                  className={inputClassName}
                  value={row.priceAmount}
                  onChange={(event) =>
                    onChange(row.id, {
                      priceAmount: event.target.value,
                    })
                  }
                  placeholder="199.99"
                  inputMode="decimal"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`pkg-days-${row.id}`}>Delivery (days)</Label>
                <Input
                  id={`pkg-days-${row.id}`}
                  type="number"
                  min={0}
                  className={inputClassName}
                  value={row.deliveryDays}
                  onChange={(event) =>
                    onChange(row.id, {
                      deliveryDays: event.target.value,
                    })
                  }
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor={`pkg-deliverables-${row.id}`}>
                Deliverables (one per line)
              </Label>
              <textarea
                id={`pkg-deliverables-${row.id}`}
                value={row.deliverables}
                onChange={(event) =>
                  onChange(row.id, {
                    deliverables: event.target.value,
                  })
                }
                rows={3}
                placeholder={"1 UGC video (30-60s)\nBasic editing"}
                className="border-input focus-visible:border-ring focus-visible:ring-ring/50 w-full resize-y rounded-lg border bg-transparent px-2.5 py-2 text-sm outline-none focus-visible:ring-3 dark:bg-input/30"
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
