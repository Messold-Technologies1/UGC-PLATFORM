"use client";

import { useState } from "react";
import { Bell, Pencil } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { NotificationsBackLink } from "@/features/notifications/components/back-link";
import { PushCopyEditor } from "@/features/notifications/components/push-copy-editor";
import {
  usePushTemplatesQuery,
  useSavePushCopyMutation,
} from "@/features/notifications/hooks/use-notifications";
import type {
  PushTemplateSummary,
  TemplateIssue,
} from "@/features/notifications/types";
import { toast } from "sonner";
import { isAxiosError } from "axios";

function readIssues(error: unknown): TemplateIssue[] | null {
  if (!isAxiosError(error)) return null;
  const issues = (error.response?.data as { issues?: TemplateIssue[] })?.issues;
  return Array.isArray(issues) ? issues : null;
}

function errorMessage(error: unknown): string {
  if (isAxiosError(error)) {
    const message = (error.response?.data as { message?: unknown })?.message;
    if (typeof message === "string" && message.trim()) return message;
  }
  return "Could not save. Try again.";
}

/**
 * One row's editor, opened in place.
 *
 * Mounted only while open and keyed by id, so its state starts from whatever
 * is stored rather than from the last row someone looked at — closing and
 * opening another is the natural way to discard an edit, and it should not
 * carry the previous one across.
 */
function RowEditor({
  row,
  onClose,
}: {
  row: PushTemplateSummary;
  onClose: () => void;
}) {
  const [title, setTitle] = useState(row.pushTitleHbs ?? "");
  const [body, setBody] = useState(row.pushBodyHbs ?? "");
  const [issues, setIssues] = useState<TemplateIssue[]>([]);
  const save = useSavePushCopyMutation(row.id);

  const dirty =
    title !== (row.pushTitleHbs ?? "") || body !== (row.pushBodyHbs ?? "");

  const onSave = () => {
    setIssues([]);
    save.mutate(
      {
        // Empty means "derive it", which is what the server stores a cleared
        // field as — the two agree without a separate flag.
        pushTitleHbs: title.trim() ? title : null,
        pushBodyHbs: body.trim() ? body : null,
      },
      {
        onSuccess: (result) => {
          toast.success(`Saved as v${result.version}`);
          onClose();
        },
        onError: (error) => {
          const found = readIssues(error);
          if (found) setIssues(found);
          else toast.error(errorMessage(error));
        },
      },
    );
  };

  return (
    <div className="space-y-3 border-t p-4">
      <PushCopyEditor
        title={title}
        body={body}
        onTitleChange={setTitle}
        onBodyChange={setBody}
        // The stored preview, which is what is live until this saves. A live
        // re-render per keystroke would need a round trip per keystroke, and
        // the fields are two lines — what you typed IS the preview.
        preview={row.preview}
        issues={issues}
      />
      <div className="flex items-center gap-2">
        <Button onClick={onSave} disabled={!dirty || save.isPending}>
          {save.isPending ? "Saving…" : "Save"}
        </Button>
        <Button variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        {dirty ? (
          <span className="text-muted-foreground text-sm">Unsaved changes</span>
        ) : null}
      </div>
    </div>
  );
}

/**
 * Browser notifications, per event.
 *
 * Its own page rather than a section of the email editor: the question is
 * what an event looks like on a lock screen, which is a different job from
 * writing its email and is usually done for a handful of events rather than
 * all of them. Each row shows what would arrive today — derived from the
 * email where nobody has written anything — so the list answers "which of
 * these read badly" without opening a single one.
 */
export default function PushTemplatesPage() {
  const { data, isLoading, isError } = usePushTemplatesQuery();
  const [openId, setOpenId] = useState<string | null>(null);
  const [filter, setFilter] = useState("");

  const rows = (data ?? []).filter((row) =>
    row.name.toLowerCase().includes(filter.trim().toLowerCase()),
  );

  return (
    <div className="mx-auto max-w-[1100px] space-y-5 p-6">
      <NotificationsBackLink />

      <div>
        <h1 className="text-2xl font-semibold">Browser notifications</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          What each event looks like on a lock screen. Left alone, the title
          comes from the email subject and the body from its opening line —
          write them here where that reads badly.
        </p>
      </div>

      <Input
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        placeholder="Filter by event key"
        className="max-w-sm"
      />

      {isError ? (
        <p className="text-muted-foreground text-sm">
          Could not load the templates. Try again shortly.
        </p>
      ) : isLoading ? (
        <div className="space-y-2">
          {[0, 1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          Nothing matches that filter.
        </p>
      ) : (
        <div className="divide-y rounded-xl border">
          {rows.map((row) => (
            <div key={row.id}>
              <div className="flex items-start gap-4 p-4">
                <div className="bg-primary/10 flex size-9 shrink-0 items-center justify-center rounded-lg">
                  <Bell className="text-primary size-4" aria-hidden />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-mono text-xs">{row.name}</p>
                    {row.customised ? (
                      <Badge variant="secondary">Custom</Badge>
                    ) : (
                      <Badge variant="outline">From the email</Badge>
                    )}
                  </div>
                  <p className="mt-1.5 truncate text-sm font-medium">
                    {row.preview.title || "—"}
                  </p>
                  <p className="text-muted-foreground line-clamp-2 text-sm">
                    {row.preview.body || "—"}
                  </p>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setOpenId(openId === row.id ? null : row.id)
                  }
                >
                  <Pencil className="size-3.5" aria-hidden />
                  {openId === row.id ? "Close" : "Edit"}
                </Button>
              </div>

              {openId === row.id ? (
                <RowEditor
                  key={row.id}
                  row={row}
                  onClose={() => setOpenId(null)}
                />
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
