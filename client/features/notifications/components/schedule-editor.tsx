"use client";

import { useState } from "react";
import { Plus, Trash2, Clock, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type {
  NotificationTemplateSummary,
  OffsetUnit,
  ScheduleRow,
} from "../types";
import { formatOffset, splitOffset, toMinutes } from "../types";

type DraftRow = ScheduleRow & { _key: string };

function toDraft(rows: ScheduleRow[]): DraftRow[] {
  return rows.map((row, i) => ({ ...row, _key: `${row.offsetMinutes}-${i}` }));
}

export function ScheduleEditor({
  rows,
  supportsDelay,
  templates,
  saving,
  onSave,
}: {
  rows: ScheduleRow[];
  /**
   * When false the event has no relevance check, so the API refuses any row
   * with an offset. The offset field is disabled rather than letting someone
   * reach that error.
   */
  supportsDelay: boolean;
  templates: NotificationTemplateSummary[];
  saving: boolean;
  onSave: (rows: ScheduleRow[]) => void;
}) {
  const [draft, setDraft] = useState<DraftRow[]>(() => toDraft(rows));

  const update = (key: string, patch: Partial<DraftRow>) =>
    setDraft((prev) =>
      prev.map((row) => (row._key === key ? { ...row, ...patch } : row)),
    );

  const addRow = () =>
    setDraft((prev) => [
      ...prev,
      {
        _key: `new-${Date.now()}`,
        offsetMinutes: prev.some((r) => r.offsetMinutes === 0) ? 1440 : 0,
        channels: ["EMAIL"],
        isActive: true,
        templateOverrideId: null,
        whatsappTemplateOverride: null,
      },
    ]);

  const duplicateOffsets = draft
    .map((r) => r.offsetMinutes)
    .filter((o, i, all) => all.indexOf(o) !== i);

  const toggleChannel = (row: DraftRow, channel: "EMAIL" | "WHATSAPP") => {
    const next = row.channels.includes(channel)
      ? row.channels.filter((c) => c !== channel)
      : [...row.channels, channel];
    update(row._key, { channels: next });
  };

  return (
    <div className="space-y-4">
      {!supportsDelay && (
        <p className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            This event can only send immediately. A delayed row needs a relevance
            check in code first — otherwise the reminder would reach people who
            have already acted.
          </span>
        </p>
      )}

      <div className="space-y-3">
        {draft.map((row) => {
          const { value, unit } = splitOffset(row.offsetMinutes);
          const isDuplicate = duplicateOffsets.includes(row.offsetMinutes);

          return (
            <div
              key={row._key}
              className={`rounded-lg border p-4 ${
                isDuplicate ? "border-red-300 bg-red-50" : "border-border"
              }`}
            >
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                  <Clock className="text-muted-foreground h-4 w-4" />
                  <Input
                    type="number"
                    min={0}
                    className="w-20"
                    value={value}
                    disabled={!supportsDelay}
                    onChange={(e) =>
                      update(row._key, {
                        offsetMinutes: toMinutes(
                          Math.max(0, Number(e.target.value) || 0),
                          unit,
                        ),
                      })
                    }
                  />
                  <Select
                    value={unit}
                    disabled={!supportsDelay}
                    onValueChange={(next) =>
                      update(row._key, {
                        offsetMinutes: toMinutes(value, next as OffsetUnit),
                      })
                    }
                  >
                    <SelectTrigger className="w-28">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="minutes">minutes</SelectItem>
                      <SelectItem value="hours">hours</SelectItem>
                      <SelectItem value="days">days</SelectItem>
                    </SelectContent>
                  </Select>
                  <span className="text-muted-foreground w-36 text-sm">
                    {formatOffset(row.offsetMinutes)}
                  </span>
                </div>

                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={row.channels.includes("EMAIL")}
                      onCheckedChange={() => toggleChannel(row, "EMAIL")}
                    />
                    Email
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={row.channels.includes("WHATSAPP")}
                      onCheckedChange={() => toggleChannel(row, "WHATSAPP")}
                    />
                    WhatsApp
                  </label>
                </div>

                <Select
                  value={row.templateOverrideId ?? "__default"}
                  onValueChange={(next) =>
                    update(row._key, {
                      templateOverrideId: next === "__default" ? null : next,
                    })
                  }
                >
                  <SelectTrigger className="w-64">
                    <SelectValue placeholder="Template" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__default">
                      Use the event&rsquo;s template
                    </SelectItem>
                    {templates.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <div className="ml-auto flex items-center gap-3">
                  <label className="flex items-center gap-2 text-sm">
                    <Switch
                      checked={row.isActive}
                      onCheckedChange={(checked) =>
                        update(row._key, { isActive: checked })
                      }
                    />
                    Active
                  </label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() =>
                      setDraft((prev) => prev.filter((r) => r._key !== row._key))
                    }
                    aria-label="Remove row"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {row.channels.length === 0 && (
                <p className="text-muted-foreground mt-2 text-xs">
                  No channels ticked — this row will not send.
                </p>
              )}
            </div>
          );
        })}
      </div>

      {duplicateOffsets.length > 0 && (
        <p className="text-sm text-red-600">
          Two rows share the same send time. Each send time can appear only once.
        </p>
      )}

      <div className="flex items-center gap-3">
        <Button type="button" variant="outline" onClick={addRow}>
          <Plus className="mr-1 h-4 w-4" />
          Add a send
        </Button>
        <Button
          type="button"
          disabled={saving || duplicateOffsets.length > 0}
          onClick={() =>
            onSave(
              draft.map((row) => ({
                offsetMinutes: row.offsetMinutes,
                channels: row.channels,
                templateOverrideId: row.templateOverrideId ?? null,
                whatsappTemplateOverride: row.whatsappTemplateOverride ?? null,
                isActive: row.isActive,
              })),
            )
          }
        >
          {saving ? "Saving…" : "Save schedule"}
        </Button>
        <p className="text-muted-foreground text-xs">
          Applies to events from now on. Use Backfill to reach recent entities.
        </p>
      </div>
    </div>
  );
}
