"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

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
  layout = "stack",
  onAdd,
  onRemove,
  onChange,
}: {
  rows: PackageDraft[];
  inputClassName: string;
  maxPackages: number;
  layout?: "stack" | "grid";
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

      <div
        className={
          layout === "grid" ? "grid gap-4 xl:grid-cols-3" : "space-y-4"
        }
      >
        {rows.map((row, index) => {
          return (
            <div
              key={row.id}
              className="rounded-xl border border-border/80 bg-background/70 p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border/60 pb-3">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Package {index + 1}
                  </p>
                  <p className="mt-1 text-sm font-medium text-foreground">
                    Build this offer clearly for brands.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 rounded-full px-3 text-muted-foreground hover:text-destructive"
                  onClick={() => onRemove(row.id)}
                >
                  Remove
                </Button>
              </div>

              <div className="mt-4 space-y-4">
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="grid gap-2">
                    <Label htmlFor={`pkg-name-${row.id}`}>Name</Label>
                    <Input
                      id={`pkg-name-${row.id}`}
                      className={inputClassName}
                      value={row.name}
                      onChange={(event) =>
                        onChange(row.id, { name: event.target.value })
                      }
                      placeholder="Starter"
                    />
                  </div>

                  <div className="grid gap-2">
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

                  <div className="grid gap-2">
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
                      placeholder="3"
                    />
                  </div>
                </div>

                <div className="grid gap-2">
                  <div className="flex items-center justify-between gap-2">
                    <Label htmlFor={`pkg-deliverables-${row.id}`}>
                      Deliverables
                    </Label>
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                      One per line
                    </p>
                  </div>
                  <Textarea
                    id={`pkg-deliverables-${row.id}`}
                    value={row.deliverables}
                    onChange={(event) =>
                      onChange(row.id, {
                        deliverables: event.target.value,
                      })
                    }
                    rows={3}
                    placeholder={"1 UGC video (30-60s)\nBasic editing"}
                    className="min-h-[92px] resize-y"
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
