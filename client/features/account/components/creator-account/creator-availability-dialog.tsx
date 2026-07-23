"use client";

import { useEffect, useState } from "react";
import { CalendarOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  useClearCreatorUnavailabilityMutation,
  useCreatorUnavailabilityQuery,
  useUpsertCreatorUnavailabilityMutation,
} from "@/features/creators/hooks/use-creator-unavailability";

function formatStatusLabel(params: {
  startsOn: string;
  endsOn: string;
  isCurrentlyUnavailable: boolean;
}): string {
  const start = new Date(`${params.startsOn}T00:00:00Z`);
  const end = new Date(`${params.endsOn}T00:00:00Z`);
  const fmt = new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
  const range = `${fmt.format(start)} – ${fmt.format(end)}`;
  return params.isCurrentlyUnavailable
    ? `Unavailable now · ${range}`
    : `Scheduled · ${range}`;
}

export function CreatorAvailabilityDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { data, isLoading } = useCreatorUnavailabilityQuery(open);
  const upsertMutation = useUpsertCreatorUnavailabilityMutation();
  const clearMutation = useClearCreatorUnavailabilityMutation();

  const [startsOn, setStartsOn] = useState("");
  const [endsOn, setEndsOn] = useState("");

  useEffect(() => {
    if (!open) return;
    setStartsOn(data?.startsOn ?? "");
    setEndsOn(data?.endsOn ?? "");
  }, [open, data?.startsOn, data?.endsOn]);

  const canSave =
    Boolean(startsOn) &&
    Boolean(endsOn) &&
    endsOn >= startsOn &&
    !upsertMutation.isPending;

  const isWorking = upsertMutation.isPending || clearMutation.isPending;

  async function handleSave() {
    if (!canSave) return;
    await upsertMutation.mutateAsync({ startsOn, endsOn });
    onOpenChange(false);
  }

  async function handleClear() {
    await clearMutation.mutateAsync();
    setStartsOn("");
    setEndsOn("");
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit your availability</DialogTitle>
          <DialogDescription>
            While unavailable, brands will see you as offline. You can schedule
            a future date range and stay available until it starts.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-10 text-muted-foreground">
            <Loader2 className="size-5 animate-spin" />
          </div>
        ) : (
          <div className="space-y-5 pt-1">
            {data ? (
              <p className="rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
                {formatStatusLabel(data)}
              </p>
            ) : (
              <p className="rounded-lg border border-border bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                You are currently available. Set dates below to schedule time
                off.
              </p>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="unavailable-starts-on">First day</Label>
                <Input
                  id="unavailable-starts-on"
                  type="date"
                  value={startsOn}
                  onChange={(e) => setStartsOn(e.target.value)}
                  disabled={isWorking}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="unavailable-ends-on">Last day</Label>
                <Input
                  id="unavailable-ends-on"
                  type="date"
                  value={endsOn}
                  min={startsOn || undefined}
                  onChange={(e) => setEndsOn(e.target.value)}
                  disabled={isWorking}
                />
              </div>
            </div>

            {startsOn && endsOn && endsOn < startsOn ? (
              <p className="text-sm text-destructive">
                Last day must be on or after the first day.
              </p>
            ) : null}
          </div>
        )}

        <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-between">
          <Button
            type="button"
            variant="ghost"
            className="text-destructive hover:text-destructive"
            disabled={!data || isWorking}
            onClick={() => void handleClear()}
          >
            {clearMutation.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <CalendarOff className="size-4" />
            )}
            Delete scheduled dates
          </Button>
          <Button
            type="button"
            disabled={!canSave}
            onClick={() => void handleSave()}
          >
            {upsertMutation.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : null}
            Save changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
