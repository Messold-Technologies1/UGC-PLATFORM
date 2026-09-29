"use client";

import { use, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft, RotateCcw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useDebouncedValue } from "@/hooks/use-debounce";
import {
  TemplateBodyEditor,
  type TextMode,
} from "@/features/notifications/components/template-body-editor";
import { TemplatePreviewPane } from "@/features/notifications/components/template-preview-pane";
import {
  useRevertTemplateMutation,
  useSaveTemplateMutation,
  useTemplatePreviewMutation,
  useTemplateQuery,
  useTemplateVersionsQuery,
} from "@/features/notifications/hooks/use-notifications";
import type {
  NotificationTemplateDetail,
  TemplateIssue,
  TemplatePreview,
} from "@/features/notifications/types";

/** The 422 body carries one issue per problem; anything else is a plain message. */
function readIssues(error: unknown): TemplateIssue[] | null {
  const data = (error as { response?: { data?: { issues?: TemplateIssue[] } } })
    ?.response?.data;
  return Array.isArray(data?.issues) ? data.issues : null;
}

function errorMessage(error: unknown): string {
  const message = (error as { response?: { data?: { message?: unknown } } })
    ?.response?.data?.message;
  if (typeof message === "string") return message;
  return error instanceof Error ? error.message : "Something went wrong";
}

export default function NotificationTemplateEditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data: template, isLoading } = useTemplateQuery(id);

  if (isLoading || !template) {
    return (
      <div className="mx-auto max-w-[1800px] space-y-4 p-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-[70vh] w-full" />
      </div>
    );
  }

  // Keyed on the version so a save or a revert remounts the editor with the
  // stored content, rather than syncing form state from an effect.
  return (
    <TemplateEditor
      key={`${template.id}:${template.version}`}
      template={template}
    />
  );
}

function TemplateEditor({ template }: { template: NotificationTemplateDetail }) {
  const id = template.id;
  const { data: versions = [] } = useTemplateVersionsQuery(id);
  const save = useSaveTemplateMutation(id);
  const preview = useTemplatePreviewMutation(id);
  const revert = useRevertTemplateMutation(id);

  const [subject, setSubject] = useState(template.subjectHbs);
  const [html, setHtml] = useState(template.htmlHbs);
  const [text, setText] = useState(template.textHbs ?? "");
  const [issues, setIssues] = useState<TemplateIssue[]>([]);
  const [rendered, setRendered] = useState<TemplatePreview | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);

  // A stored template starts "manual": the bundled copies were written by hand
  // and say the same thing in a different shape, so following the HTML would
  // throw that wording away on the first keystroke. One with no stored text has
  // nothing to lose and follows the HTML from the start. The first preview
  // upgrades "manual" to "auto" when the two already agree.
  const [textMode, setTextMode] = useState<TextMode>(
    template.textHbs?.trim() ? "manual" : "auto",
  );
  const settledInitialMode = useRef(false);

  const derivedText = rendered?.derivedTextHbs ?? null;

  // In auto mode the text follows the HTML, so it is not part of what we ask
  // the server to render — otherwise each derived value would trigger the next
  // preview, and the two would chase each other.
  const previewKey = useDebouncedValue(
    JSON.stringify({
      subject,
      html,
      textHbs: textMode === "manual" ? text : null,
    }),
    400,
  );

  useEffect(() => {
    const draft = JSON.parse(previewKey) as {
      subject: string;
      html: string;
      textHbs: string | null;
    };
    preview.mutate(
      {
        draft: {
          subjectHbs: draft.subject,
          htmlHbs: draft.html,
          textHbs: draft.textHbs,
        },
      },
      {
        onSuccess: (result) => {
          setPreviewError(null);
          setRendered(result);

          if (!settledInitialMode.current) {
            settledInitialMode.current = true;
            // Already identical to what the HTML implies: nothing would be lost
            // by following it, so follow it.
            if (
              template.textHbs?.trim() &&
              template.textHbs.trim() === result.derivedTextHbs.trim()
            ) {
              setTextMode("auto");
            }
          }
        },
        onError: (error) => setPreviewError(errorMessage(error)),
      },
    );
    // `preview` is a stable mutation object; re-running on it would loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [previewKey]);

  // Auto mode mirrors the derivation the server just handed back.
  useEffect(() => {
    if (textMode === "auto" && derivedText !== null) setText(derivedText);
  }, [textMode, derivedText]);

  const dirty = useMemo(
    () =>
      subject !== template.subjectHbs ||
      html !== template.htmlHbs ||
      text !== (template.textHbs ?? ""),
    [subject, html, text, template],
  );

  const onSave = () => {
    setIssues([]);
    save.mutate(
      {
        name: template.name,
        description: template.description,
        subjectHbs: subject,
        htmlHbs: html,
        textHbs: text.trim() ? text : null,
      },
      {
        onSuccess: (result) => toast.success(`Saved as v${result.version}`),
        onError: (error) => {
          const found = readIssues(error);
          if (found) {
            // Validation rejects rather than letting a broken template render
            // as blank at send time, so show exactly what to fix.
            setIssues(found);
            toast.error("This template cannot be saved yet");
          } else {
            toast.error(errorMessage(error));
          }
        },
      },
    );
  };

  return (
    <div className="mx-auto max-w-[1800px] space-y-5 p-6">
      <Link
        href="/admin/notifications/templates"
        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm"
      >
        <ArrowLeft className="h-4 w-4" />
        All templates
      </Link>

      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-mono text-xl font-semibold">{template.name}</h1>
          <p className="text-muted-foreground mt-1 text-xs">
            Version {template.version} · updated{" "}
            {new Date(template.updatedAt).toLocaleString()}
            {dirty && <span className="ml-2 text-amber-700">unsaved changes</span>}
          </p>
        </div>
        <Button onClick={onSave} disabled={save.isPending || !dirty}>
          {save.isPending ? "Saving…" : "Save"}
        </Button>
      </header>

      {issues.length > 0 && (
        <ul className="space-y-1 rounded-md border border-red-200 bg-red-50 p-4 text-sm">
          {issues.map((issue, i) => (
            <li key={i} className="text-red-900">
              <span className="font-medium capitalize">{issue.part}</span>
              {" — "}
              {issue.message}
            </li>
          ))}
        </ul>
      )}

      <div className="grid gap-6 xl:grid-cols-[230px_minmax(0,1fr)_minmax(0,620px)]">
        <aside className="order-2 space-y-6 xl:order-1">
          <div>
            <h2 className="mb-2 text-sm font-medium">Variables in use</h2>
            <div className="flex flex-wrap gap-1.5">
              {template.referencedVars.length === 0 ? (
                <span className="text-muted-foreground text-xs">None yet</span>
              ) : (
                template.referencedVars.map((name) => (
                  <Badge key={name} variant="secondary" className="font-mono">
                    {name}
                  </Badge>
                ))
              )}
            </div>
          </div>

          {versions.length > 0 && (
            <div>
              <h2 className="mb-2 text-sm font-medium">History</h2>
              <ul className="space-y-2">
                {versions.map((version) => (
                  <li
                    key={version.id}
                    className="flex items-center justify-between gap-2 text-xs"
                  >
                    <div className="min-w-0">
                      <p>v{version.version}</p>
                      <p className="text-muted-foreground truncate">
                        {version.note ??
                          new Date(version.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={revert.isPending}
                      onClick={() =>
                        revert.mutate(version.version, {
                          onSuccess: () =>
                            toast.success(`Restored v${version.version}`),
                          onError: (error) => toast.error(errorMessage(error)),
                        })
                      }
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                    </Button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </aside>

        <div className="order-1 xl:order-2">
          <TemplateBodyEditor
            subject={subject}
            onSubjectChange={setSubject}
            html={html}
            onHtmlChange={setHtml}
            text={text}
            onTextChange={(value) => {
              setTextMode("manual");
              setText(value);
            }}
            textMode={textMode}
            onRegenerateText={() => setTextMode("auto")}
            derivedText={derivedText}
          />
        </div>

        <div className="order-3 xl:sticky xl:top-6 xl:h-[calc(100vh-6rem)]">
          <TemplatePreviewPane
            preview={rendered}
            isPending={preview.isPending}
            error={previewError}
          />
        </div>
      </div>
    </div>
  );
}
