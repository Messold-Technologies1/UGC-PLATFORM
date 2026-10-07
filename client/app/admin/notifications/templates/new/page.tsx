"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useDebouncedValue } from "@/hooks/use-debounce";
import {
  TemplateBodyEditor,
  type TextMode,
} from "@/features/notifications/components/template-body-editor";
import { EmailVisualEditor } from "@/features/notifications/components/email-visual-editor";
import { TemplatePreviewPane } from "@/features/notifications/components/template-preview-pane";
import {
  useDraftPreviewMutation,
  useSaveTemplateMutation,
} from "@/features/notifications/hooks/use-notifications";
import type {
  EmailBodyDoc,
  TemplateIssue,
  TemplatePreview,
} from "@/features/notifications/types";

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

export default function NewNotificationTemplatePage() {
  const router = useRouter();
  const save = useSaveTemplateMutation(null);
  const preview = useDraftPreviewMutation();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [subject, setSubject] = useState("");
  const [html, setHtml] = useState("");
  // New templates start in the visual editor — writing raw email HTML by hand
  // is exactly what it exists to replace. HTML stays one click away.
  const [mode, setMode] = useState<"visual" | "html">("visual");
  const [bodyDoc, setBodyDoc] = useState<EmailBodyDoc>({
    type: "doc",
    content: [{ type: "paragraph" }],
  });
  const [text, setText] = useState("");
  const [textMode, setTextMode] = useState<TextMode>("auto");
  const [issues, setIssues] = useState<TemplateIssue[]>([]);
  const [rendered, setRendered] = useState<TemplatePreview | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);

  const derivedText = rendered?.derivedTextHbs ?? null;
  const usingDoc = mode === "visual";
  // An untouched document is a single empty paragraph, which is not a body.
  const docHasContent = (bodyDoc.content ?? []).some(
    (node) => JSON.stringify(node) !== JSON.stringify({ type: "paragraph" }),
  );
  const bodyMissing = usingDoc ? !docHasContent : html.trim().length === 0;
  const canSave =
    name.trim().length >= 3 && subject.trim().length > 0 && !bodyMissing;

  const previewKey = useDebouncedValue(
    JSON.stringify({
      name,
      subject,
      html: usingDoc ? null : html,
      bodyDoc: usingDoc ? bodyDoc : null,
      textHbs: textMode === "manual" ? text : null,
    }),
    400,
  );

  useEffect(() => {
    const draft = JSON.parse(previewKey) as {
      name: string;
      subject: string;
      html: string | null;
      bodyDoc: EmailBodyDoc | null;
      textHbs: string | null;
    };
    // Nothing to render yet: the endpoint resolves variables from the name and
    // needs a body of one kind or the other.
    const hasBody = draft.bodyDoc
      ? (draft.bodyDoc.content ?? []).length > 0
      : Boolean(draft.html?.trim());
    if (!draft.name.trim() || !hasBody) return;

    preview.mutate(
      {
        name: draft.name,
        subjectHbs: draft.subject,
        ...(draft.bodyDoc
          ? { bodyDoc: draft.bodyDoc }
          : { htmlHbs: draft.html ?? "" }),
        textHbs: draft.textHbs,
      },
      {
        onSuccess: (result) => {
          setPreviewError(null);
          setRendered(result);
        },
        onError: (error) => setPreviewError(errorMessage(error)),
      },
    );
    // `preview` is a stable mutation object; re-running on it would loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [previewKey]);

  useEffect(() => {
    if (textMode === "auto" && derivedText !== null) setText(derivedText);
  }, [textMode, derivedText]);

  const onSave = () => {
    setIssues([]);
    save.mutate(
      {
        name: name.trim(),
        description: description.trim() || null,
        subjectHbs: subject,
        ...(usingDoc ? { bodyDoc } : { htmlHbs: html }),
        textHbs: text.trim() ? text : null,
      },
      {
        onSuccess: (result) => {
          toast.success("Template created");
          router.push(`/admin/notifications/templates/${result.id}`);
        },
        onError: (error) => {
          const found = readIssues(error);
          if (found) {
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
          <h1 className="text-xl font-semibold">New email template</h1>
          <p className="text-muted-foreground mt-1 text-xs">
            Name it after the event it serves and it is picked up automatically.
          </p>
        </div>
        <Button onClick={onSave} disabled={save.isPending || !canSave}>
          {save.isPending ? "Creating…" : "Create template"}
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
        <aside className="order-2 space-y-4 xl:order-1">
          <div className="space-y-1.5">
            <label className="text-sm font-medium" htmlFor="tpl-name">
              Name <span className="text-red-600">*</span>
            </label>
            <Input
              id="tpl-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="font-mono text-sm"
              placeholder="order-brief-submitted-for-creator"
            />
            <p className="text-muted-foreground text-xs">
              Matching an event key links it to that event and resolves its
              variables.
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium" htmlFor="tpl-description">
              Description
            </label>
            <Input
              id="tpl-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="text-sm"
              placeholder="Optional"
            />
          </div>
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

          {mode === "visual" ? (
            <div className="space-y-1.5">
              <label
                className="text-sm font-medium"
                htmlFor="tpl-subject-visual"
              >
                Subject
              </label>
              <Input
                id="tpl-subject-visual"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="font-mono text-sm"
                placeholder="Welcome to {{platformName}}"
              />
              <EmailVisualEditor
                doc={bodyDoc}
                onChange={setBodyDoc}
                variables={Object.keys(rendered?.context ?? {})}
              />
            </div>
          ) : (
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
              htmlRequired
            />
          )}
        </div>

        <div className="order-3 xl:sticky xl:top-6 xl:h-[calc(100vh-6rem)]">
          {name.trim() && !bodyMissing ? (
            <TemplatePreviewPane
              preview={rendered}
              isPending={preview.isPending}
              error={previewError}
            />
          ) : (
            <div className="text-muted-foreground flex h-full items-center justify-center rounded-md border border-dashed p-8 text-center text-sm">
              Add a name and some body content to see the preview.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
