"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import {
  ArrowLeft,
  Trash2,
  Plus,
  Eye,
  CheckCircle2,
  XCircle,
  AlertCircle,
  History,
  Check,
  GripVertical,
  Clock,
  FileText,
  Upload,
} from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  DragOverlay,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { SortableTocItem, TocItem } from "./sortable-toc-item";

import { useAdminLegalPageDetailQuery } from "@/features/admin/hooks/use-admin-legal-pages-query";
import {
  useSaveLegalPageDraftMutation,
  useImportLegalPageDraftMutation,
  useSubmitLegalPageForReviewMutation,
  usePublishLegalPageDraftMutation,
  useRejectLegalPageDraftMutation,
  useDiscardLegalPageDraftMutation,
} from "@/features/admin/hooks/use-admin-legal-page-mutations";
import { useAdminLegalPageVersionsQuery } from "@/features/admin/hooks/use-admin-legal-pages-query";
import type { DraftSectionData } from "@/features/admin/types";
import { useMeQuery } from "@/features/auth/hooks/use-me-query";

import { RichTextEditor } from "@/components/admin/rich-text-editor";
import { LegalVersionPreviewModal } from "@/components/admin/legal-version-preview-modal";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

/** Encode binary file bytes (e.g. a .docx) as base64 for a JSON request body. */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

export default function AdminLegalPageEditor() {
  const params = useParams();
  const router = useRouter();
  const slug =
    (Array.isArray(params.slug) ? params.slug[0] : params.slug) || "";

  const { data: page, isLoading, isError } = useAdminLegalPageDetailQuery(slug);
  const { data: versionsData } = useAdminLegalPageVersionsQuery(slug);

  const saveDraftMutation = useSaveLegalPageDraftMutation(slug);
  const importMutation = useImportLegalPageDraftMutation(slug);
  const submitReviewMutation = useSubmitLegalPageForReviewMutation(slug);
  const publishMutation = usePublishLegalPageDraftMutation(slug);
  const rejectMutation = useRejectLegalPageDraftMutation(slug);
  const discardMutation = useDiscardLegalPageDraftMutation(slug);

  const { data: me } = useMeQuery();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [effectiveDate, setEffectiveDate] = useState("");
  type SectionWithId = DraftSectionData & { _id: string };
  const [sections, setSections] = useState<SectionWithId[]>([]);
  const [changeNote, setChangeNote] = useState("");
  const [previewVersionId, setPreviewVersionId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("editor");

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const [isEditingDraft, setIsEditingDraft] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!page) return;

    if (page.draft) {
      setTitle(page.draft.title);
      setDescription(page.draft.description);
      setEffectiveDate(page.draft.effectiveDate);
      setSections(
        page.draft.sections.map((s: any) => ({
          ...s,
          _id: crypto.randomUUID(),
        })),
      );
      setChangeNote(page.draft.changeNote || "");
      setIsEditingDraft(true);
    } else {
      setTitle(page.title);
      setDescription(page.description);
      setEffectiveDate(page.effectiveDate);

      setSections(
        page.sections.map((s) => ({
          anchorId: s.anchorId,
          title: s.title,
          tocLabel: s.tocLabel,
          content: s.content,
          sortOrder: s.sortOrder,
          _id: crypto.randomUUID(),
        })),
      );
      setChangeNote("");
      setIsEditingDraft(false);
    }
  }, [page]);

  const isDirty = useMemo(() => {
    if (!page) return false;

    const currentData = {
      title,
      description,
      effectiveDate,
      sections: sections.map((s) => ({
        anchorId: s.anchorId,
        title: s.title,
        tocLabel: s.tocLabel || "",
        content: s.content,
        sortOrder: s.sortOrder,
      })),
      changeNote: changeNote || null,
    };

    if (page.draft) {
      const originalData = {
        title: page.draft.title,
        description: page.draft.description,
        effectiveDate: page.draft.effectiveDate,
        sections: page.draft.sections.map((s: any) => ({
          anchorId: s.anchorId,
          title: s.title,
          tocLabel: s.tocLabel || "",
          content: s.content,
          sortOrder: s.sortOrder,
        })),
        changeNote: page.draft.changeNote || null,
      };
      return JSON.stringify(currentData) !== JSON.stringify(originalData);
    } else {
      const originalData = {
        title: page.title,
        description: page.description,
        effectiveDate: page.effectiveDate,
        sections: page.sections.map((s: any) => ({
          anchorId: s.anchorId,
          title: s.title,
          tocLabel: s.tocLabel || "",
          content: s.content,
          sortOrder: s.sortOrder,
        })),
        changeNote: null,
      };
      return JSON.stringify(currentData) !== JSON.stringify(originalData);
    }
  }, [page, title, description, effectiveDate, sections, changeNote]);

  if (isLoading) {
    return (
      <div className="p-8 space-y-8 max-w-7xl mx-auto animate-pulse">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-32 w-full rounded-2xl" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  if (isError || !page) {
    return (
      <div className="p-8 max-w-7xl mx-auto">
        <div className="rounded-2xl border border-border/10 bg-card/10 py-20 text-center text-sm text-muted-foreground glass-panel">
          We could not load this legal page.
        </div>
      </div>
    );
  }

  const isSaving = saveDraftMutation.isPending;
  const isSubmitting = submitReviewMutation.isPending;
  const isImporting = importMutation.isPending;
  const anyPending =
    isSaving ||
    isSubmitting ||
    isImporting ||
    publishMutation.isPending ||
    rejectMutation.isPending;

  const draftStatus = page.draft?.status;
  const isReviewMode = draftStatus === "IN_REVIEW";
  const isMyDraft = page.draft?.createdBy === me?.id;
  const isReadonlyDraft = Boolean(draftStatus === "DRAFT" && page.draft?.createdBy && !isMyDraft);
  const isReadonlyMode = isReviewMode || isReadonlyDraft;

  const handlePreview = () => {
    const previewData = {
      title,
      description,
      effectiveDate,
      sections,
      updatedAt: new Date().toISOString(),
    };
    sessionStorage.setItem("legal-preview-data", JSON.stringify(previewData));
    router.push(`/admin/legal/${page.slug}/preview`);
  };

  const addSection = () => {
    setSections([
      ...sections,
      {
        anchorId: `section-${Date.now()}`,
        title: "",
        tocLabel: "",
        content: "",
        sortOrder: sections.length,
        _id: crypto.randomUUID(),
      },
    ]);
  };

  const removeSection = (index: number) => {
    const newSections = [...sections];
    newSections.splice(index, 1);
    setSections(newSections.map((s, i) => ({ ...s, sortOrder: i })));
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (over && active.id !== over.id) {
      setSections((items) => {
        const oldIndex = items.findIndex((item) => item._id === active.id);
        const newIndex = items.findIndex((item) => item._id === over.id);

        const newItems = arrayMove(items, oldIndex, newIndex);
        return newItems.map((item, index) => ({ ...item, sortOrder: index }));
      });
    }
  };

  const handleDragCancel = () => {
    setActiveId(null);
  };

  const updateSection = (index: number, updates: Partial<DraftSectionData>) => {
    const newSections = [...sections];
    newSections[index] = { ...newSections[index], ...updates };
    setSections(newSections);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleImportFile = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const input = event.target;
    const file = input.files?.[0];
    // Reset immediately so selecting the same file again re-triggers onChange.
    input.value = "";
    if (!file) return;

    const name = file.name.toLowerCase();
    const isMarkdown = name.endsWith(".md") || name.endsWith(".markdown");
    const isDocx = name.endsWith(".docx");
    const isHtml =
      name.endsWith(".html") || name.endsWith(".htm") || name.endsWith(".txt");

    if (!isMarkdown && !isHtml && !isDocx) {
      window.alert(
        "Unsupported file type. Please upload a .docx, .md, .markdown, .html, .htm, or .txt file.",
      );
      return;
    }

    const confirmed = window.confirm(
      `Import "${file.name}"?\n\nThis replaces the current draft content with sections parsed from the file. You can still review and edit everything before submitting.`,
    );
    if (!confirmed) return;

    // .docx is binary — send it base64-encoded; text formats send as-is.
    const format = isDocx ? "docx" : isMarkdown ? "markdown" : "html";
    const content = isDocx
      ? arrayBufferToBase64(await file.arrayBuffer())
      : await file.text();

    await importMutation.mutateAsync({
      format,
      content,
      changeNote: `Imported from ${file.name}`,
    });
  };

  const handleSaveDraft = async () => {
    const sectionsToSave = sections.map(({ _id, ...rest }) => rest);
    await saveDraftMutation.mutateAsync({
      title,
      description,
      effectiveDate,
      sections: sectionsToSave,
      changeNote,
    });
  };

  const handleSubmitReview = async () => {
    if (isDirty) {
      const sectionsToSave = sections.map(({ _id, ...rest }) => rest);
      await saveDraftMutation.mutateAsync({
        title,
        description,
        effectiveDate,
        sections: sectionsToSave,
        changeNote,
      });
    }
    await submitReviewMutation.mutateAsync();
  };

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto pb-32">
      <div className="flex items-center gap-4 text-sm">
        <Link
          href="/admin/legal"
          className="text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
        >
          <ArrowLeft className="size-4" />
          Back to List
        </Link>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-foreground tracking-tight">
            Edit: {page.title}
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            /{page.slug} • Last updated{" "}
            {format(new Date(page.updatedAt), "MMM d, yyyy")}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {page.draft && (
            <button
              onClick={handlePreview}
              className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-background text-sm font-semibold hover:bg-muted transition-colors"
            >
              <Eye className="size-4" />
              Preview
            </button>
          )}
        </div>
      </div>

      {draftStatus === "IN_REVIEW" && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 flex items-start sm:items-center gap-4">
          <AlertCircle className="size-5 text-amber-500 mt-0.5 sm:mt-0" />
          <div className="flex-1">
            <h4 className="font-semibold text-amber-600 dark:text-amber-400">
              Draft is in review
            </h4>
            <p className="text-sm text-amber-600/80 dark:text-amber-400/80">
              This draft has been submitted for review.
              {page.draft?.createdBy && (
                <span className="block mt-1 font-mono text-xs opacity-80" title="Proposer Admin ID">
                  Proposed by: {page.draft.createdByEmail || page.draft.createdBy}
                </span>
              )}
              {page.draft?.restoredFromVersionId && (
                <span className="inline-block mt-2 px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-700 dark:text-amber-400 text-xs font-semibold border border-amber-500/30">
                  Restored from past version
                </span>
              )}
              {page.draft?.reviewNote && (
                <span className="block mt-1 italic">
                  Note: {page.draft.reviewNote}
                </span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => rejectMutation.mutateAsync({})}
              disabled={anyPending}
              className="px-3 py-1.5 rounded-lg border border-red-500/30 text-red-500 text-xs font-bold uppercase tracking-wider hover:bg-red-500/10 transition-colors disabled:opacity-50"
            >
              Reject
            </button>
            <div className="flex flex-col items-end">
              <button
                onClick={() => publishMutation.mutateAsync()}
                disabled={anyPending || isMyDraft}
                className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-bold uppercase tracking-wider hover:brightness-110 transition-colors disabled:opacity-50 flex items-center gap-1"
                title={isMyDraft ? "You cannot publish a draft you proposed. Another admin must review it." : "Publish this draft live"}
              >
                <Check className="size-4" />
                Publish Live
              </button>
              {isMyDraft && (
                <span className="text-[10px] text-amber-600/70 dark:text-amber-400/70 mt-1 mr-1">
                  Requires another admin to review
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {draftStatus === "DRAFT" && (
        <div className="rounded-xl border border-blue-500/30 bg-blue-500/10 p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <History className="size-5 text-blue-500" />
            <div>
              <h4 className="font-semibold text-blue-600 dark:text-blue-400">
                Unpublished Draft
              </h4>
              <p className="text-xs text-blue-600/80 dark:text-blue-400/80 mt-1 max-w-md">
                {isReadonlyDraft ? (
                  <>This draft is currently being edited by <strong>{page.draft?.createdByEmail || "another admin"}</strong>. You cannot modify or discard it.</>
                ) : (
                  <>You can make changes to this draft in the editor below. When you're ready, click <strong>Submit for Review</strong> at the bottom of the page.</>
                )}
              </p>
              {page.draft?.reviewNote && (
                <p className="text-sm text-blue-600/80 dark:text-blue-400/80 italic mt-2">
                  Returned for revision: {page.draft.reviewNote}
                </p>
              )}
            </div>
          </div>
            <button
              onClick={() => {
                if (
                  window.confirm("Are you sure you want to discard this draft?")
                ) {
                  discardMutation.mutateAsync();
                }
              }}
              disabled={anyPending || isReadonlyDraft}
              className="px-3 py-1.5 rounded-lg border border-red-500/30 text-red-500 text-xs font-bold uppercase tracking-wider hover:bg-red-500/10 transition-colors disabled:opacity-50 flex items-center gap-1"
            >
              <XCircle className="size-3.5" />
              Discard
            </button>
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6 mt-6">
        <TabsList className="bg-muted/50 p-1 w-full max-w-sm grid grid-cols-2">
          <TabsTrigger value="editor">Page Editor</TabsTrigger>
          <TabsTrigger value="history">Publish History</TabsTrigger>
        </TabsList>

        <TabsContent value="editor" className="space-y-6">
          <section className="glass-panel rounded-2xl border border-border/50 p-6 space-y-4">
          <h2 className="text-lg font-bold">Page Metadata</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Page Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={isReadonlyMode || anyPending}
                className="w-full glass-input rounded-lg px-4 py-2 text-sm bg-background/50 disabled:opacity-60"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Effective Date
              </label>
              <input
                type="text"
                value={effectiveDate}
                onChange={(e) => setEffectiveDate(e.target.value)}
                disabled={isReadonlyMode || anyPending}
                placeholder="e.g. June 16, 2026"
                className="w-full glass-input rounded-lg px-4 py-2 text-sm bg-background/50 disabled:opacity-60"
              />
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Description (SEO & Subtitle)
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={isReadonlyMode || anyPending}
                rows={2}
                className="w-full glass-input rounded-lg px-4 py-2 text-sm bg-background/50 resize-y disabled:opacity-60"
              />
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold">Content Sections</h2>
              <p className="text-sm text-muted-foreground">
                {sections.length} section{sections.length !== 1 && "s"}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept=".docx,.md,.markdown,.html,.htm,.txt"
                onChange={handleImportFile}
                className="hidden"
              />
              <button
                onClick={handleImportClick}
                disabled={isReadonlyMode || anyPending}
                title="Import a Word (.docx), Markdown, or HTML file — its headings become sections"
                className="px-3 py-1.5 rounded-lg border border-border bg-background text-muted-foreground text-xs font-bold uppercase tracking-wider hover:bg-muted hover:text-foreground transition-colors disabled:opacity-50 flex items-center gap-1"
              >
                <Upload className="size-3.5" />
                {isImporting ? "Importing..." : "Import File"}
              </button>
              <button
                onClick={addSection}
                disabled={isReadonlyMode || anyPending}
                className="px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider hover:bg-primary/20 transition-colors disabled:opacity-50 flex items-center gap-1"
              >
                <Plus className="size-3.5" />
                Add Section
              </button>
            </div>
          </div>

          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDragCancel={handleDragCancel}
          >
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
              <div className="lg:col-span-2 space-y-6">
                {sections.map((section, index) => (
                  <div
                    key={section._id}
                    className="glass-panel rounded-2xl border border-border/50 p-6 space-y-4 relative"
                  >
                    <div className="absolute right-4 top-4 flex items-center gap-1 bg-background/80 backdrop-blur border border-border rounded-lg p-1">
                      <button
                        onClick={() => {
                          if (window.confirm("Remove this section?")) {
                            removeSection(index);
                          }
                        }}
                        disabled={isReadonlyMode || anyPending}
                        className="p-1.5 text-red-500 hover:bg-red-500/10 rounded-md disabled:opacity-30"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="h-6 w-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">
                        {index + 1}
                      </div>
                      <h3 className="font-semibold">Section details</h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                          Section Title
                        </label>
                        <input
                          type="text"
                          value={section.title}
                          onChange={(e) =>
                            updateSection(index, { title: e.target.value })
                          }
                          placeholder="e.g. Data Collection"
                          disabled={isReadonlyMode || anyPending}
                          className="w-full glass-input rounded-lg px-3 py-1.5 text-sm bg-background/50 disabled:opacity-60"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                          TOC Label
                        </label>
                        <input
                          type="text"
                          value={section.tocLabel}
                          onChange={(e) =>
                            updateSection(index, { tocLabel: e.target.value })
                          }
                          placeholder="Short name for sidebar"
                          disabled={isReadonlyMode || anyPending}
                          className="w-full glass-input rounded-lg px-3 py-1.5 text-sm bg-background/50 disabled:opacity-60"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                          Anchor ID
                        </label>
                        <input
                          type="text"
                          value={section.anchorId}
                          onChange={(e) =>
                            updateSection(index, {
                              anchorId: e.target.value
                                .toLowerCase()
                                .replace(/[^a-z0-9-]/g, "-"),
                            })
                          }
                          disabled={isReadonlyMode || anyPending}
                          className="w-full glass-input rounded-lg px-3 py-1.5 text-sm bg-background/50 font-mono disabled:opacity-60"
                        />
                      </div>
                    </div>

                    <div className="pt-2">
                      <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5 block">
                        Content
                      </label>
                      <RichTextEditor
                        value={section.content}
                        onChange={(html) =>
                          updateSection(index, { content: html })
                        }
                        disabled={isReadonlyMode || anyPending}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="lg:col-span-1 sticky top-24 space-y-4">
                <div className="glass-panel rounded-2xl border border-border/50 p-6">
                  <h3 className="font-bold text-lg mb-6 text-foreground flex items-center justify-between">
                    Table of Content
                  </h3>
                  <SortableContext
                    items={sections.map((s) => s._id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="max-h-[60vh] overflow-y-auto pr-2 space-y-1 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-border hover:[&::-webkit-scrollbar-thumb]:bg-muted-foreground/30">
                      {sections.map((section, index) => (
                        <SortableTocItem
                          key={section._id}
                          id={section._id}
                          title={section.tocLabel || section.title}
                          index={index}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </div>
              </div>
            </div>

            <DragOverlay>
              {activeId ? (
                <TocItem
                  title={
                    sections.find((s) => s._id === activeId)?.tocLabel ||
                    sections.find((s) => s._id === activeId)?.title ||
                    ""
                  }
                  index={sections.findIndex((s) => s._id === activeId)}
                  isOverlay
                />
              ) : null}
            </DragOverlay>
          </DndContext>
        </section>
        </TabsContent>

        <TabsContent value="history" className="space-y-6">
          {versionsData && versionsData.versions.length > 0 ? (
            <section className="glass-panel rounded-2xl border border-border/50 p-6 space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <History className="size-5 text-muted-foreground" />
                <h2 className="text-lg font-bold">Publish History</h2>
              </div>
              <div className="space-y-3">
                {versionsData.versions.map((v) => (
                  <div
                    key={v.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-xl border border-border/30 bg-background/50"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-sm">Published Version</p>
                        <span className="text-[10px] font-mono text-muted-foreground bg-muted/50 border border-border/50 px-1.5 py-0.5 rounded" title="Version ID">
                          {v.id}
                        </span>
                      </div>
                      {v.changeNote && (
                        <p className="text-sm text-muted-foreground italic mt-0.5">
                          &quot;{v.changeNote}&quot;
                        </p>
                      )}
                    </div>
                    <div className="text-right text-xs text-muted-foreground mt-2 sm:mt-0">
                      <p>
                        {format(new Date(v.createdAt), "MMM d, yyyy 'at' h:mm a")}
                      </p>
                      <p className="mt-0.5 text-[10px] opacity-70">
                        by: {v.changedByEmail || "Unknown Admin"}
                      </p>
                    </div>
                    <div className="mt-3 sm:mt-0 sm:ml-4 flex-shrink-0">
                      <button
                        onClick={() => setPreviewVersionId(v.id)}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                      >
                        <Eye className="size-3.5" />
                        View
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ) : (
            <section className="glass-panel rounded-2xl border border-border/50 p-10 text-center">
              <History className="size-10 text-muted-foreground/30 mx-auto mb-4" />
              <p className="text-lg font-semibold text-muted-foreground">No publish history yet.</p>
            </section>
          )}
        </TabsContent>
      </Tabs>

        <div className="fixed bottom-0 left-0 right-0 bg-background/80 backdrop-blur-md border-t border-border p-4 z-40">
          <div className="max-w-5xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex-1 max-w-sm">
              <input
                type="text"
                placeholder="What changed? (Optional commit note)"
                value={changeNote}
                onChange={(e) => setChangeNote(e.target.value)}
                disabled={isReadonlyMode || anyPending}
                className="w-full glass-input rounded-lg px-4 py-2 text-sm bg-background/50 disabled:opacity-60"
              />
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleSaveDraft}
                disabled={isReadonlyMode || anyPending || !isDirty}
                className="px-6 py-2.5 rounded-xl border border-border bg-card text-foreground text-sm font-semibold hover:bg-muted transition-colors disabled:opacity-50"
              >
                {isSaving ? (
                  "Saving..."
                ) : !isDirty && page?.draft ? (
                  <span className="flex items-center gap-1.5"><Check className="size-4" /> Saved</span>
                ) : (
                  "Save Draft"
                )}
              </button>
              <button
                onClick={handleSubmitReview}
                disabled={isReadonlyMode || anyPending || (!isDirty && !page?.draft)}
                className="px-6 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:brightness-110 active:scale-95 transition-all disabled:opacity-50 shadow-sm"
              >
                {isSubmitting ? "Submitting..." : "Submit for Review"}
              </button>
            </div>
          </div>
        </div>

      <LegalVersionPreviewModal
        slug={slug}
        versionId={previewVersionId}
        isOpen={!!previewVersionId}
        onClose={() => setPreviewVersionId(null)}
        onRestoreSuccess={() => setActiveTab("editor")}
      />
    </div>
  );
}
