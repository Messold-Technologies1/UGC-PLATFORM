"use client";

import { useEffect, useState } from "react";
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
  useSubmitLegalPageForReviewMutation,
  usePublishLegalPageDraftMutation,
  useRejectLegalPageDraftMutation,
  useDiscardLegalPageDraftMutation,
} from "@/features/admin/hooks/use-admin-legal-page-mutations";
import { useAdminLegalPageVersionsQuery } from "@/features/admin/hooks/use-admin-legal-pages-query";
import type { DraftSectionData } from "@/features/admin/types";

import { RichTextEditor } from "@/components/admin/rich-text-editor";
import { Skeleton } from "@/components/ui/skeleton";

export default function AdminLegalPageEditor() {
  const params = useParams();
  const router = useRouter();
  const slug = (Array.isArray(params.slug) ? params.slug[0] : params.slug) || "";

  const { data: page, isLoading, isError } = useAdminLegalPageDetailQuery(slug);
  const { data: versionsData } = useAdminLegalPageVersionsQuery(slug);

  const saveDraftMutation = useSaveLegalPageDraftMutation(slug);
  const submitReviewMutation = useSubmitLegalPageForReviewMutation(slug);
  const publishMutation = usePublishLegalPageDraftMutation(slug);
  const rejectMutation = useRejectLegalPageDraftMutation(slug);
  const discardMutation = useDiscardLegalPageDraftMutation(slug);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [effectiveDate, setEffectiveDate] = useState("");
  type SectionWithId = DraftSectionData & { _id: string };
  const [sections, setSections] = useState<SectionWithId[]>([]);
  const [changeNote, setChangeNote] = useState("");

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const [isEditingDraft, setIsEditingDraft] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);

  // Initialize form state
  useEffect(() => {
    if (!page) return;

    if (page.draft) {
      setTitle(page.draft.title);
      setDescription(page.draft.description);
      setEffectiveDate(page.draft.effectiveDate);
      setSections(page.draft.sections.map((s: any) => ({ ...s, _id: crypto.randomUUID() })));
      setChangeNote(page.draft.changeNote || "");
      setIsEditingDraft(true);
    } else {
      setTitle(page.title);
      setDescription(page.description);
      setEffectiveDate(page.effectiveDate);
      // Map live sections to draft section data (omit db id)
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
  const isPublishing = publishMutation.isPending;
  const isRejecting = rejectMutation.isPending;
  const isDiscarding = discardMutation.isPending;

  const anyPending =
    isSaving || isSubmitting || isPublishing || isRejecting || isDiscarding;

  const draftStatus = page.draft?.status;
  const isReviewMode = draftStatus === "IN_REVIEW";

  // Section Management
  const addSection = () => {
    setSections([
      ...sections,
      {
        anchorId: `section-${Date.now()}`,
        title: "New Section",
        tocLabel: "New Section",
        content: "<p>Start typing...</p>",
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

  // Actions
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
    // Save draft first to ensure latest changes are caught
    const sectionsToSave = sections.map(({ _id, ...rest }) => rest);
    await saveDraftMutation.mutateAsync({
      title,
      description,
      effectiveDate,
      sections: sectionsToSave,
      changeNote,
    });
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
            <Link
              href={`/admin/legal/${page.slug}/preview`}
              target="_blank"
              className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-background text-sm font-semibold hover:bg-muted transition-colors"
            >
              <Eye className="size-4" />
              Preview
            </Link>
          )}
        </div>
      </div>

      {/* Status Banner */}
      {draftStatus === "IN_REVIEW" && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 flex items-start sm:items-center gap-4">
          <AlertCircle className="size-5 text-amber-500 mt-0.5 sm:mt-0" />
          <div className="flex-1">
            <h4 className="font-semibold text-amber-600 dark:text-amber-400">
              Draft is in review
            </h4>
            <p className="text-sm text-amber-600/80 dark:text-amber-400/80">
              This draft has been submitted for review.
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
            <button
              onClick={() => publishMutation.mutateAsync()}
              disabled={anyPending}
              className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-bold uppercase tracking-wider hover:brightness-110 transition-colors disabled:opacity-50 flex items-center gap-1"
            >
              <CheckCircle2 className="size-3.5" />
              Publish Live
            </button>
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
              {page.draft?.reviewNote && (
                <p className="text-sm text-blue-600/80 dark:text-blue-400/80 italic mt-1">
                  Returned for revision: {page.draft.reviewNote}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={() => {
              if (window.confirm("Are you sure you want to discard this draft?")) {
                discardMutation.mutateAsync();
              }
            }}
            disabled={anyPending}
            className="px-3 py-1.5 rounded-lg border border-red-500/30 text-red-500 text-xs font-bold uppercase tracking-wider hover:bg-red-500/10 transition-colors disabled:opacity-50 flex items-center gap-1"
          >
            <XCircle className="size-3.5" />
            Discard
          </button>
        </div>
      )}

      <div className="space-y-6">
        {/* Page Metadata */}
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
                disabled={isReviewMode || anyPending}
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
                disabled={isReviewMode || anyPending}
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
                disabled={isReviewMode || anyPending}
                rows={2}
                className="w-full glass-input rounded-lg px-4 py-2 text-sm bg-background/50 resize-y disabled:opacity-60"
              />
            </div>
          </div>
        </section>

        {/* Sections */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold">Content Sections</h2>
              <p className="text-sm text-muted-foreground">{sections.length} section{sections.length !== 1 && 's'}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={addSection}
                disabled={isReviewMode || anyPending}
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
              {/* Left Column: Editors */}
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
                        disabled={isReviewMode || anyPending}
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
                          onChange={(e) => updateSection(index, { title: e.target.value })}
                          disabled={isReviewMode || anyPending}
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
                          onChange={(e) => updateSection(index, { tocLabel: e.target.value })}
                          disabled={isReviewMode || anyPending}
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
                          onChange={(e) => updateSection(index, { anchorId: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') })}
                          disabled={isReviewMode || anyPending}
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
                        onChange={(html) => updateSection(index, { content: html })}
                        disabled={isReviewMode || anyPending}
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Right Column: Sticky Sidebar */}
              <div className="lg:col-span-1 sticky top-24 space-y-4">
                <div className="glass-panel rounded-2xl border border-border/50 p-6">
                  <h3 className="font-bold text-lg mb-6 text-foreground flex items-center justify-between">
                    Content
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
                  title={sections.find(s => s._id === activeId)?.tocLabel || sections.find(s => s._id === activeId)?.title || ""}
                  index={sections.findIndex(s => s._id === activeId)}
                  isOverlay
                />
              ) : null}
            </DragOverlay>
          </DndContext>
        </section>

        {/* Version History */}
        {versionsData && versionsData.versions.length > 0 && (
          <section className="glass-panel rounded-2xl border border-border/50 p-6 space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <History className="size-5 text-muted-foreground" />
              <h2 className="text-lg font-bold">Publish History</h2>
            </div>
            <div className="space-y-3">
              {versionsData.versions.map((v) => (
                <div key={v.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-xl border border-border/30 bg-background/50">
                  <div>
                    <p className="font-semibold text-sm">Published version</p>
                    {v.changeNote && <p className="text-sm text-muted-foreground italic mt-0.5">&quot;{v.changeNote}&quot;</p>}
                  </div>
                  <div className="text-right text-xs text-muted-foreground mt-2 sm:mt-0">
                    <p>{format(new Date(v.createdAt), "MMM d, yyyy 'at' h:mm a")}</p>
                    <p className="mt-0.5" title={`Admin ID: ${v.changedBy}`}>by Admin</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Bottom Actions */}
        <div className="fixed bottom-0 left-0 right-0 bg-background/80 backdrop-blur-md border-t border-border p-4 z-40">
          <div className="max-w-5xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex-1 max-w-sm">
              <input
                type="text"
                placeholder="What changed? (Optional commit note)"
                value={changeNote}
                onChange={(e) => setChangeNote(e.target.value)}
                disabled={isReviewMode || anyPending}
                className="w-full glass-input rounded-lg px-4 py-2 text-sm bg-background/50 disabled:opacity-60"
              />
            </div>
            
            <div className="flex items-center gap-3">
              <button
                onClick={handleSaveDraft}
                disabled={isReviewMode || anyPending}
                className="px-6 py-2.5 rounded-xl border border-border bg-card text-foreground text-sm font-semibold hover:bg-muted transition-colors disabled:opacity-50"
              >
                {isSaving ? "Saving..." : "Save Draft"}
              </button>
              <button
                onClick={handleSubmitReview}
                disabled={isReviewMode || anyPending}
                className="px-6 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:brightness-110 active:scale-95 transition-all disabled:opacity-50 shadow-sm"
              >
                {isSubmitting ? "Submitting..." : "Submit for Review"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
