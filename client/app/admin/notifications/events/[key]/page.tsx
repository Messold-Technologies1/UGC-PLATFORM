"use client";

import { use, useState } from "react";
import { toast } from "sonner";
import { History, UserCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScheduleEditor } from "@/features/notifications/components/schedule-editor";
import { NotificationsBackLink } from "@/features/notifications/components/back-link";
import {
  useBackfillMutation,
  useNotificationEventQuery,
  useReplaceScheduleMutation,
  useSweepMutation,
  useTemplatesQuery,
  useUpdateEventMutation,
} from "@/features/notifications/hooks/use-notifications";
import { formatOffset, type ScheduleRow } from "@/features/notifications/types";

/** Pulls the useful line out of an API error without leaking a stack. */
function errorMessage(error: unknown): string {
  const body = (error as { response?: { data?: { message?: unknown } } })?.response
    ?.data?.message;
  if (typeof body === "string") return body;
  if (error instanceof Error) return error.message;
  return "Something went wrong";
}

export default function NotificationEventDetailPage({
  params,
}: {
  params: Promise<{ key: string }>;
}) {
  const { key } = use(params);
  const eventKey = decodeURIComponent(key);

  const { data: event, isLoading } = useNotificationEventQuery(eventKey);
  const { data: templates = [] } = useTemplatesQuery();
  const updateEvent = useUpdateEventMutation(eventKey);
  const replaceSchedule = useReplaceScheduleMutation(eventKey);
  const backfill = useBackfillMutation(eventKey);
  const sweep = useSweepMutation(eventKey);

  const [waName, setWaName] = useState<string | null>(null);

  if (isLoading || !event) {
    return (
      <div className="mx-auto max-w-5xl space-y-4 p-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const saveSchedule = (rows: ScheduleRow[]) => {
    replaceSchedule.mutate(rows, {
      onSuccess: () => toast.success("Schedule saved"),
      // The 422 for a delayed row on an event with no relevance check carries
      // the explanation, so show it rather than a generic failure.
      onError: (error) => toast.error(errorMessage(error)),
    });
  };

  return (
    <div className="mx-auto max-w-5xl space-y-8 p-6">
      <NotificationsBackLink
        href="/admin/notifications/events"
        label="All events"
      />

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold">{event.label}</h1>
            <Badge variant="outline">{event.recipient.toLowerCase()}</Badge>
            {event.alwaysSend && (
              <Badge variant="secondary">Ignores opt-out</Badge>
            )}
          </div>
          <p className="text-muted-foreground mt-1 font-mono text-xs">
            {event.key}
          </p>
          {event.description && (
            <p className="text-muted-foreground mt-2 max-w-2xl text-sm">
              {event.description}
            </p>
          )}
        </div>

        <label className="flex items-center gap-2 text-sm">
          <Switch
            checked={event.isActive}
            onCheckedChange={(checked) =>
              updateEvent.mutate(
                { isActive: checked },
                {
                  onSuccess: () =>
                    toast.success(checked ? "Event on" : "Event off"),
                  onError: (error) => toast.error(errorMessage(error)),
                },
              )
            }
          />
          Active
        </label>
      </header>

      <section className="space-y-4 rounded-lg border p-5">
        <h2 className="font-medium">Templates</h2>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Email</label>
            <Select
              value={event.emailTemplateId ?? "__none"}
              onValueChange={(next) =>
                updateEvent.mutate(
                  { emailTemplateId: next === "__none" ? null : next },
                  {
                    onSuccess: () => toast.success("Template updated"),
                    onError: (error) => toast.error(errorMessage(error)),
                  },
                )
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Pick a template" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none">
                  None — falls back to the bundled file
                </SelectItem>
                {templates.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">WhatsApp</label>
            <div className="flex gap-2">
              <Input
                value={waName ?? event.whatsappTemplateName}
                onChange={(e) => setWaName(e.target.value)}
                placeholder="order_brief_submitted_for_creator"
                className="font-mono text-sm"
              />
              <Button
                variant="outline"
                disabled={waName === null || waName === event.whatsappTemplateName}
                onClick={() =>
                  updateEvent.mutate(
                    { whatsappTemplateName: waName },
                    {
                      onSuccess: () => {
                        setWaName(null);
                        toast.success("WhatsApp template updated");
                      },
                      onError: (error) => toast.error(errorMessage(error)),
                    },
                  )
                }
              >
                Save
              </Button>
            </div>
            <p className="text-muted-foreground text-xs">
              The copy lives in WhatsApp Manager. This is only the approved
              template&rsquo;s name, which Meta requires to match{" "}
              <code>^[a-z0-9_]+$</code>.
            </p>
          </div>
        </div>
      </section>

      <section className="space-y-4 rounded-lg border p-5">
        <div>
          <h2 className="font-medium">When to send</h2>
          <p className="text-muted-foreground mt-1 text-sm">
            Each row is one send, measured from the moment the event happens.
          </p>
        </div>

        <ScheduleEditor
          key={event.schedule.map((r) => r.offsetMinutes).join(",")}
          rows={event.schedule}
          supportsDelay={event.supportsDelay}
          templates={templates}
          saving={replaceSchedule.isPending}
          onSave={saveSchedule}
        />
      </section>

      {event.schedule.some((row) => row.offsetMinutes > 0) && (
        <section className="space-y-3 rounded-lg border p-5">
          <div className="flex items-center gap-2">
            <History className="text-muted-foreground h-4 w-4" />
            <h2 className="font-medium">Apply a row to recent entities</h2>
          </div>
          <p className="text-muted-foreground text-sm">
            A new row only affects events from now on. This applies one to
            everything that fired in the last 7 days, timed from when it actually
            happened.
          </p>
          <div className="flex flex-wrap gap-2">
            {event.schedule
              .filter((row) => row.offsetMinutes > 0)
              .map((row) => (
                <Button
                  key={row.offsetMinutes}
                  variant="outline"
                  size="sm"
                  disabled={backfill.isPending}
                  onClick={() =>
                    backfill.mutate(
                      { offsetMinutes: row.offsetMinutes, dryRun: true },
                      {
                        onSuccess: (result) =>
                          toast.info(
                            `${result.matched} entit${
                              result.matched === 1 ? "y" : "ies"
                            } would receive “${formatOffset(row.offsetMinutes)}”`,
                            {
                              action: {
                                label: "Apply",
                                onClick: () =>
                                  backfill.mutate(
                                    { offsetMinutes: row.offsetMinutes },
                                    {
                                      onSuccess: (applied) =>
                                        toast.success(
                                          `Queued for ${applied.enqueued}`,
                                        ),
                                      onError: (error) =>
                                        toast.error(errorMessage(error)),
                                    },
                                  ),
                              },
                            },
                          ),
                        onError: (error) => toast.error(errorMessage(error)),
                      },
                    )
                  }
                >
                  {formatOffset(row.offsetMinutes)}
                </Button>
              ))}
          </div>
        </section>
      )}

      {event.canSweep && (
        <section className="space-y-3 rounded-lg border p-5">
          <div className="flex items-center gap-2">
            <UserCheck className="text-muted-foreground h-4 w-4" />
            <h2 className="font-medium">Send to older profiles</h2>
          </div>
          <p className="text-muted-foreground text-sm">
            Nothing &ldquo;happens&rdquo; to make a profile incomplete, so there
            is no moment to send from. New signups are handled automatically.
            Creators who signed up before this existed have never been reached —
            this is how you reach them.
          </p>
          <p className="text-muted-foreground text-sm">
            Each creator receives <strong>one</strong> email: the latest stage
            they have passed, not every stage at once.
          </p>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="outline"
              disabled={sweep.isPending}
              onClick={() =>
                sweep.mutate(true, {
                  onSuccess: (result) => {
                    const count = result.wouldSend ?? 0;
                    if (count === 0) {
                      toast.info("No older profiles are waiting for this.");
                      return;
                    }
                    toast.info(
                      `${count} creator${count === 1 ? "" : "s"} would receive this ` +
                        `(of ${result.scanned} scanned).`,
                      {
                        duration: 15000,
                        action: {
                          label: `Send to ${count}`,
                          onClick: () =>
                            sweep.mutate(false, {
                              onSuccess: (sent) =>
                                toast.success(
                                  `Queued for ${sent.enqueued ?? 0} creator(s).`,
                                ),
                              onError: (error) => toast.error(errorMessage(error)),
                            }),
                        },
                      },
                    );
                  },
                  onError: (error) => toast.error(errorMessage(error)),
                })
              }
            >
              {sweep.isPending ? "Checking…" : "Check how many are waiting"}
            </Button>
            <p className="text-muted-foreground text-xs">
              Nothing is sent until you confirm the number.
            </p>
          </div>
        </section>
      )}

      <section className="space-y-3 rounded-lg border p-5">
        <h2 className="font-medium">Available variables</h2>
        <p className="text-muted-foreground text-sm">
          These are what this event&rsquo;s templates may use. Anything else is
          rejected when the template is saved.
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          {Object.entries(event.vars).map(([name, spec]) => (
            <div
              key={name}
              className="bg-muted/40 flex items-baseline gap-2 rounded px-3 py-2 text-sm"
            >
              <code className="font-mono">{`{{${name}}}`}</code>
              <span className="text-muted-foreground truncate text-xs">
                {spec.example}
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
