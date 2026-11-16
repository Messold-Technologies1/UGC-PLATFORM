"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Megaphone, Send, TriangleAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { NotificationsBackLink } from "@/features/notifications/components/back-link";
import {
  useBroadcastAudiencesQuery,
  useBroadcastsQuery,
  useSendBroadcastMutation,
  useTemplatesQuery,
} from "@/features/notifications/hooks/use-notifications";
import type {
  BroadcastAudienceKey,
  BroadcastRun,
  NotificationChannel,
} from "@/features/notifications/types";

const ALL_CHANNELS: NotificationChannel[] = ["EMAIL", "WHATSAPP", "PUSH"];

function errorMessage(error: unknown): string {
  const message = (error as { response?: { data?: { message?: unknown } } })
    ?.response?.data?.message;
  if (typeof message === "string") return message;
  return error instanceof Error ? error.message : "Something went wrong";
}

function statusVariant(status: BroadcastRun["status"]) {
  if (status === "COMPLETED") return "secondary" as const;
  return "outline" as const;
}

export default function BroadcastsPage() {
  const { data: audiences, isLoading } = useBroadcastAudiencesQuery();
  const { data: templates = [] } = useTemplatesQuery();
  const { data: runs = [] } = useBroadcastsQuery();
  const send = useSendBroadcastMutation();

  const [audience, setAudience] = useState<BroadcastAudienceKey | "">("");
  const [templateId, setTemplateId] = useState("");
  const [whatsappName, setWhatsappName] = useState("");
  const [note, setNote] = useState("");
  const [channels, setChannels] = useState<NotificationChannel[]>(["EMAIL"]);
  const [confirming, setConfirming] = useState(false);

  const selected = useMemo(
    () => audiences?.find((a) => a.audience === audience) ?? null,
    [audiences, audience],
  );

  const toggle = (channel: NotificationChannel) =>
    setChannels((current) =>
      current.includes(channel)
        ? current.filter((c) => c !== channel)
        : [...current, channel],
    );

  // A switched-off event cannot send: the server refuses, and queueing jobs
  // that would all skip is worse than the button being disabled.
  const canSend =
    Boolean(selected) &&
    Boolean(selected?.isActive) &&
    channels.length > 0 &&
    !send.isPending;

  const onSend = () => {
    if (!selected) return;
    send.mutate(
      {
        audience: selected.audience,
        channels,
        emailTemplateId: templateId || null,
        whatsappTemplateName: whatsappName.trim() || null,
        note: note.trim() || null,
      },
      {
        onSuccess: (run) => {
          setConfirming(false);
          setNote("");
          toast.success(
            `Queued ${run.enqueued.toLocaleString()} of ${run.matched.toLocaleString()}`,
          );
        },
        onError: (error) => {
          setConfirming(false);
          toast.error(errorMessage(error));
        },
      },
    );
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <NotificationsBackLink />

      <header>
        <h1 className="flex items-center gap-2 text-2xl font-semibold">
          <Megaphone className="h-5 w-5" />
          Broadcasts
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Send an announcement to a standing audience. Opt-outs, suppressed
          addresses and missing phone numbers are respected per recipient and
          recorded in the delivery log.
        </p>
      </header>

      <section className="space-y-5 rounded-lg border p-5">
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Audience</label>
          {isLoading ? (
            <Skeleton className="h-10 w-full" />
          ) : (
            <Select
              value={audience}
              onValueChange={(v) => setAudience(v as BroadcastAudienceKey)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Choose who this goes to" />
              </SelectTrigger>
              <SelectContent>
                {audiences?.map((a) => (
                  <SelectItem key={a.audience} value={a.audience}>
                    {a.label} — {a.size.toLocaleString()}
                    {!a.isActive && " · off"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {selected && (
            <p className="text-muted-foreground text-xs">
              {selected.description} Sends through{" "}
              <span className="font-mono">{selected.eventKey}</span>.
            </p>
          )}
          {selected && !selected.isActive && (
            <p className="flex items-start gap-1.5 text-xs text-amber-700">
              <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>
                This event is switched off, so nothing can be sent through it
                yet. Turn it on in Notifications → Events first.
              </span>
            </p>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Email template</label>
            <Select value={templateId} onValueChange={setTemplateId}>
              <SelectTrigger>
                <SelectValue placeholder="Use the event's own template" />
              </SelectTrigger>
              <SelectContent>
                {templates.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium" htmlFor="wa-name">
              WhatsApp template name
            </label>
            <Input
              id="wa-name"
              value={whatsappName}
              onChange={(e) => setWhatsappName(e.target.value)}
              className="font-mono text-sm"
              placeholder={selected?.eventKey.replace(/-/g, "_") ?? ""}
            />
            <p className="text-muted-foreground text-xs">
              Must already be approved in WhatsApp Manager.
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Channels</label>
          <div className="flex flex-wrap gap-4">
            {ALL_CHANNELS.map((channel) => (
              <label
                key={channel}
                className="flex cursor-pointer items-center gap-2 text-sm"
              >
                <Checkbox
                  checked={channels.includes(channel)}
                  onCheckedChange={() => toggle(channel)}
                />
                {channel.toLowerCase()}
              </label>
            ))}
          </div>
          {channels.length === 0 && (
            <p className="text-xs text-red-600">Pick at least one channel.</p>
          )}
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium" htmlFor="note">
            Note
          </label>
          <Input
            id="note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="What this announcement is — shown in the history below"
          />
        </div>

        {confirming && selected ? (
          <div className="space-y-3 rounded-md border border-amber-300 bg-amber-50 p-4">
            <p className="flex items-start gap-2 text-sm text-amber-900">
              <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                This queues up to{" "}
                <strong>{selected.size.toLocaleString()}</strong>{" "}
                {channels.length > 1 ? "recipients" : "recipients"} on{" "}
                {channels.map((c) => c.toLowerCase()).join(", ")}. It cannot be
                recalled once queued.
              </span>
            </p>
            <div className="flex gap-2">
              <Button onClick={onSend} disabled={send.isPending}>
                {send.isPending ? "Queueing…" : "Yes, send it"}
              </Button>
              <Button
                variant="ghost"
                onClick={() => setConfirming(false)}
                disabled={send.isPending}
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <Button onClick={() => setConfirming(true)} disabled={!canSend}>
            <Send className="mr-1 h-4 w-4" />
            Send broadcast
          </Button>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium">History</h2>
        {runs.length === 0 ? (
          <p className="text-muted-foreground rounded-lg border border-dashed p-6 text-center text-sm">
            Nothing sent yet.
          </p>
        ) : (
          <ul className="divide-y rounded-lg border">
            {runs.map((run) => (
              <li key={run.id} className="flex flex-wrap gap-3 p-4 text-sm">
                <div className="min-w-0 flex-1">
                  <p className="font-medium">
                    {run.note ?? run.audience.replace(/_/g, " ").toLowerCase()}
                  </p>
                  <p className="text-muted-foreground text-xs">
                    {new Date(run.createdAt).toLocaleString()} ·{" "}
                    {run.channels.map((c) => c.toLowerCase()).join(", ")}
                    {run.emailTemplate && ` · ${run.emailTemplate.name}`}
                  </p>
                  {run.error && (
                    <p className="mt-1 text-xs text-red-600">{run.error}</p>
                  )}
                </div>
                <div className="flex shrink-0 items-start gap-2">
                  <span className="text-muted-foreground text-xs">
                    {run.enqueued.toLocaleString()} / {run.matched.toLocaleString()}
                  </span>
                  <Badge
                    variant={statusVariant(run.status)}
                    className={
                      run.status === "FAILED"
                        ? "border-red-300 bg-red-50 text-red-700"
                        : undefined
                    }
                  >
                    {run.status.toLowerCase()}
                  </Badge>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
