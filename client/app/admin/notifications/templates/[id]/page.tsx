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
import { EmailVisualEditor } from "@/features/notifications/components/email-visual-editor";
import { TemplatePreviewPane } from "@/features/notifications/components/template-preview-pane";
import {
  useRevertTemplateMutation,
  useTemplateBodyDocQuery,
  useSaveTemplateMutation,
  useTemplatePreviewMutation,
  useTemplateQuery,
  useTemplateVersionsQuery,
} from "@/features/notifications/hooks/use-notifications";
import type {
  EmailBodyDoc,
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

function TemplateEditor({
  template,
}: {
  template: NotificationTemplateDetail;
}) {
  const id = template.id;
  const { data: versions = [] } = useTemplateVersionsQuery(id);
  const save = useSaveTemplateMutation(id);
  const preview = useTemplatePreviewMutation(id);
  const revert = useRevertTemplateMutation(id);

  const [subject, setSubject] = useState(template.subjectHbs);
  const [html, setHtml] = useState(template.htmlHbs);
  // Opens in the visual editor, including for the hand-written templates: the
  // body is read back into a document and, when that cannot be done faithfully,
  // the pane says why and hands over to HTML. Nothing is written either way
  // until Save, and the preview alongside shows what a save would store.
  const [mode, setMode] = useState<"visual" | "html">("visual");
  const [bodyDoc, setBodyDoc] = useState<EmailBodyDoc | null>(template.bodyDoc);
  // What the document looked like when it was opened. For a stored one that is
  // the stored value; for a hand-written body it is whatever the import read
  // back, so simply opening a template is not "unsaved changes" — only editing
  // it is. Saving an unchanged import would write the same email anyway.
  const [baselineDoc, setBaselineDoc] = useState<EmailBodyDoc | null>(
    template.bodyDoc,
  );
  const bodyDocQuery = useTemplateBodyDocQuery(id, mode === "visual");
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

  // The import is only a starting point: it lands in state, the preview shows
  // what it would store, and nothing is written until Save.
  const importedDoc = bodyDocQuery.data?.doc ?? null;
  useEffect(() => {
    if (mode === "visual" && !bodyDoc && importedDoc) {
      setBodyDoc(importedDoc);
      setBaselineDoc(importedDoc);
    }
  }, [mode, bodyDoc, importedDoc]);

  // In auto mode the text follows the HTML, so it is not part of what we ask
  // the server to render — otherwise each derived value would trigger the next
  // preview, and the two would chase each other.
  const usingDoc = mode === "visual" && bodyDoc !== null;
  const previewKey = useDebouncedValue(
    JSON.stringify({
      subject,
      html: usingDoc ? null : html,
      bodyDoc: usingDoc ? bodyDoc : null,
      textHbs: textMode === "manual" ? text : null,
    }),
    400,
  );

  useEffect(() => {
    const draft = JSON.parse(previewKey) as {
      subject: string;
      html: string | null;
      bodyDoc: EmailBodyDoc | null;
      textHbs: string | null;
    };
    // Nothing to render yet while the document is still being fetched.
    if (draft.html === null && draft.bodyDoc === null) return;
    preview.mutate(
      {
        draft: {
          subjectHbs: draft.subject,
          ...(draft.bodyDoc
            ? { bodyDoc: draft.bodyDoc }
            : { htmlHbs: draft.html ?? "" }),
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
      (usingDoc
        ? JSON.stringify(bodyDoc) !== JSON.stringify(baselineDoc)
        : html !== template.htmlHbs) ||
      text !== (template.textHbs ?? ""),
    [subject, html, text, template, usingDoc, bodyDoc, baselineDoc],
  );

  const onSave = () => {
    setIssues([]);
    save.mutate(
      {
        name: template.name,
        description: template.description,
        subjectHbs: subject,
        // With a document the server renders the HTML; sending one as well
        // would just be a second, ignorable source of truth.
        ...(usingDoc ? { bodyDoc } : { htmlHbs: html }),
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
            {dirty && (
              <span className="ml-2 text-amber-700">unsaved changes</span>
            )}
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

        <div className="order-1 space-y-3 xl:order-2">
          <div className="flex flex-wrap items-center gap-2">
            <div className="bg-muted inline-flex rounded-lg p-0.5">
              <button
                type="button"
                onClick={() => setMode("visual")}
                className={`rounded-md px-3 py-1.5 text-sm transition-colors ${
                  mode === "visual"
                    ? "bg-background font-medium shadow-sm"
                    : "text-muted-foreground"
                }`}
              >
                Visual
              </button>
              <button
                type="button"
                onClick={() => setMode("html")}
                className={`rounded-md px-3 py-1.5 text-sm transition-colors ${
                  mode === "html"
                    ? "bg-background font-medium shadow-sm"
                    : "text-muted-foreground"
                }`}
              >
                HTML
              </button>
            </div>
            <p className="text-muted-foreground text-xs">
              {mode === "visual"
                ? "Colours and spacing are fixed — the server styles each block when it renders the email."
                : "Raw Handlebars. The body is wrapped in the email shell on send."}
            </p>
          </div>

          {mode === "visual" && bodyDocQuery.data?.supported === false ? (
            <div className="space-y-2 rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              <p>{bodyDocQuery.data.reason}</p>
              <p className="text-amber-800">
                Editing it as HTML keeps that behaviour intact.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setMode("html")}
              >
                Back to HTML
              </Button>
            </div>
          ) : null}

          {mode === "visual" &&
          bodyDocQuery.data?.supported !== false &&
          bodyDoc ? (
            <div className="space-y-1.5">
              <label
                className="text-sm font-medium"
                htmlFor="tpl-subject-visual"
              >
                Subject
              </label>
              <input
                id="tpl-subject-visual"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="border-input bg-background w-full rounded-md border px-3 py-2 font-mono text-sm"
              />
              <EmailVisualEditor
                doc={bodyDoc}
                onChange={setBodyDoc}
                onReady={(ready) => {
                  // Both, not just the baseline: parsing fills in defaults a
                  // stored document may not carry, so keeping the raw value as
                  // the working copy would read as edited the moment it opens.
                  setBodyDoc(ready);
                  setBaselineDoc(ready);
                }}
                variables={Object.keys(rendered?.context ?? {})}
              />
            </div>
          ) : null}

          {mode === "visual" && bodyDocQuery.isLoading && !bodyDoc ? (
            <Skeleton className="h-[420px] w-full" />
          ) : null}

          {mode === "html" ? (
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
          ) : null}
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
