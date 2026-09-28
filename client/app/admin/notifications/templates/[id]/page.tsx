"use client";

import { use, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft, Eye, RotateCcw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
      <div className="mx-auto max-w-6xl space-y-4 p-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  // Keyed on the version so a save or a revert remounts the editor with the
  // stored content, rather than syncing form state from an effect.
  return <TemplateEditor key={`${template.id}:${template.version}`} template={template} />;
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
  const [text, setText] = useState(template.textHbs ?? "");
  const [issues, setIssues] = useState<TemplateIssue[]>([]);
  const [rendered, setRendered] = useState<TemplatePreview | null>(null);

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
    <div className="mx-auto max-w-6xl space-y-6 p-6">
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
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            disabled={preview.isPending}
            onClick={() =>
              preview.mutate(undefined, {
                onSuccess: setRendered,
                onError: (error) => toast.error(errorMessage(error)),
              })
            }
          >
            <Eye className="mr-1 h-4 w-4" />
            Preview
          </Button>
          <Button onClick={onSave} disabled={save.isPending}>
            {save.isPending ? "Saving…" : "Save"}
          </Button>
        </div>
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

      <div className="grid gap-6 lg:grid-cols-[1fr_260px]">
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Subject</label>
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="font-mono text-sm"
            />
          </div>

          <Tabs defaultValue="html">
            <TabsList>
              <TabsTrigger value="html">HTML</TabsTrigger>
              <TabsTrigger value="text">Plain text</TabsTrigger>
              {rendered && <TabsTrigger value="preview">Preview</TabsTrigger>}
            </TabsList>

            <TabsContent value="html">
              <Textarea
                value={html}
                onChange={(e) => setHtml(e.target.value)}
                rows={22}
                className="font-mono text-xs"
              />
              <p className="text-muted-foreground mt-2 text-xs">
                The body only — the shared shell adds the header, footer and
                branding.
              </p>
            </TabsContent>

            <TabsContent value="text">
              <Textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={22}
                className="font-mono text-xs"
                placeholder="Leave empty to derive the plain-text part from the HTML."
              />
            </TabsContent>

            {rendered && (
              <TabsContent value="preview">
                <div className="space-y-3">
                  <p className="text-sm">
                    <span className="text-muted-foreground">Subject: </span>
                    {rendered.subject}
                  </p>
                  <iframe
                    title="Rendered preview"
                    srcDoc={rendered.html}
                    className="h-[600px] w-full rounded border bg-white"
                  />
                </div>
              </TabsContent>
            )}
          </Tabs>
        </div>

        <aside className="space-y-6">
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
      </div>
    </div>
  );
}
