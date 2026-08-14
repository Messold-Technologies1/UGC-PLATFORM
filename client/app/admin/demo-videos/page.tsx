"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import {
  AlertTriangle,
  Film,
  ImagePlus,
  Pencil,
  Plus,
  Trash2,
  Video as VideoIcon,
  X,
} from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  presignDemoVideoUpload,
  putToPresignedUrl,
} from "@/features/demo-videos/api/admin-demo-videos";
import {
  useAdminDemoVideosQuery,
  useCreateDemoVideoMutation,
  useDeleteDemoVideoMutation,
  useUpdateDemoVideoMutation,
} from "@/features/demo-videos/hooks/use-admin-demo-videos";
import type { DemoVideoApi } from "@/features/demo-videos/types";

const VIDEO_ACCEPT = "video/mp4,video/quicktime,video/webm,.mp4,.mov,.webm";
const IMAGE_ACCEPT = "image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp";
const MAX_VIDEO_BYTES = 200 * 1024 * 1024;

type FormState = {
  title: string;
  caption: string;
  sortOrder: string;
  active: boolean;
};

const EMPTY_FORM: FormState = { title: "", caption: "", sortOrder: "0", active: true };

async function uploadFile(
  file: File,
  kind: "video" | "thumbnail",
): Promise<string> {
  const presign = await presignDemoVideoUpload({
    kind,
    contentType: file.type,
    contentLength: file.size,
  });
  await putToPresignedUrl(file, presign);
  return presign.key;
}

export default function AdminDemoVideosPage() {
  const { data, isLoading, isError } = useAdminDemoVideosQuery();
  const createMutation = useCreateDemoVideoMutation();
  const updateMutation = useUpdateDemoVideoMutation();
  const deleteMutation = useDeleteDemoVideoMutation();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingVideo, setEditingVideo] = useState<DemoVideoApi | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [posterFile, setPosterFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  const videoInputRef = useRef<HTMLInputElement>(null);
  const posterInputRef = useRef<HTMLInputElement>(null);

  const videos = data ?? [];
  const isSaving = createMutation.isPending || updateMutation.isPending || isUploading;

  const openCreate = () => {
    setEditingVideo(null);
    setForm(EMPTY_FORM);
    setVideoFile(null);
    setPosterFile(null);
    setIsFormOpen(true);
  };

  const openEdit = (video: DemoVideoApi) => {
    setEditingVideo(video);
    setForm({
      title: video.title,
      caption: video.caption ?? "",
      sortOrder: String(video.sortOrder),
      active: video.active,
    });
    setVideoFile(null);
    setPosterFile(null);
    setIsFormOpen(true);
  };

  const closeForm = () => {
    if (isSaving) return;
    setIsFormOpen(false);
  };

  const handleVideoSelect = (file: File | null) => {
    if (!file) return;
    if (file.size > MAX_VIDEO_BYTES) {
      toast.error("Video must be 200 MB or smaller.");
      return;
    }
    setVideoFile(file);
  };

  const handleSubmit = async () => {
    const title = form.title.trim();
    if (!title) {
      toast.error("Title is required.");
      return;
    }
    if (!editingVideo && !videoFile) {
      toast.error("Choose a video to upload.");
      return;
    }

    const sortOrder = Number(form.sortOrder);

    setIsUploading(true);
    try {
      const videoKey = videoFile ? await uploadFile(videoFile, "video") : undefined;
      const thumbnailKey = posterFile
        ? await uploadFile(posterFile, "thumbnail")
        : undefined;

      if (editingVideo) {
        await updateMutation.mutateAsync({
          id: editingVideo.id,
          payload: {
            title,
            caption: form.caption.trim() || undefined,
            videoKey,
            thumbnailKey,
            sortOrder: Number.isFinite(sortOrder) ? sortOrder : undefined,
            active: form.active,
          },
        });
      } else {
        await createMutation.mutateAsync({
          title,
          caption: form.caption.trim() || undefined,
          videoKey: videoKey!,
          thumbnailKey,
          sortOrder: Number.isFinite(sortOrder) ? sortOrder : 0,
          active: form.active,
        });
      }
      setIsFormOpen(false);
    } catch {
      // mutation hooks already toast; keep the drawer open so the admin can retry.
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    await deleteMutation.mutateAsync(id);
    setConfirmingId(null);
  };

  return (
    <div className="space-y-8 p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
            Demo Intro Videos
          </h1>
          <p className="mt-1 text-muted-foreground">
            The &ldquo;Watch a few examples&rdquo; gallery shown on the Intro Video wizard
            step. Same set for every creator.
          </p>
        </div>
        <button
          onClick={openCreate}
          className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:brightness-110 active:scale-95"
        >
          <Plus className="size-4" />
          Add Example Video
        </button>
      </div>

      {isLoading && (
        <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} className="aspect-[9/16] w-full rounded-2xl" />
          ))}
        </div>
      )}

      {!isLoading && isError && (
        <div className="rounded-2xl border border-border/40 bg-card/40 px-6 py-20 text-center text-sm text-muted-foreground">
          We could not load demo videos right now. Try again shortly.
        </div>
      )}

      {!isLoading && !isError && videos.length === 0 && (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border/60 bg-card/20 px-6 py-20 text-center">
          <Film className="size-6 text-muted-foreground/60" />
          <p className="text-sm text-muted-foreground">
            No example videos yet. Add a few to show creators the format you want.
          </p>
        </div>
      )}

      {!isLoading && !isError && videos.length > 0 && (
        <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-5">
          {videos.map((video) => {
            const isConfirming = confirmingId === video.id;
            const isDeletingThis = deleteMutation.isPending && isConfirming;

            return (
              <div
                key={video.id}
                className="group relative overflow-hidden rounded-2xl border border-border/40 bg-card/40 shadow-sm"
              >
                <div className="relative aspect-[9/16] w-full overflow-hidden bg-muted">
                  {video.thumbnailUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={video.thumbnailUrl}
                      alt={video.title}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <video
                      src={video.videoUrl}
                      muted
                      playsInline
                      preload="metadata"
                      className="h-full w-full object-cover"
                    />
                  )}
                  {!video.active && (
                    <span className="absolute left-2 top-2 rounded-full bg-black/70 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                      Hidden
                    </span>
                  )}
                  <span className="absolute right-2 top-2 rounded-full bg-black/70 px-2 py-0.5 text-[10px] font-bold text-white">
                    #{video.sortOrder}
                  </span>

                  <div className="absolute inset-x-0 bottom-0 flex items-center justify-end gap-1.5 bg-gradient-to-t from-black/80 to-transparent p-2">
                    <button
                      onClick={() => openEdit(video)}
                      title="Edit"
                      className="rounded-lg bg-white/90 p-1.5 text-foreground shadow-sm transition-colors hover:bg-white"
                    >
                      <Pencil className="size-3.5" />
                    </button>
                    <button
                      onClick={() => setConfirmingId(video.id)}
                      title="Delete"
                      className="rounded-lg bg-white/90 p-1.5 text-red-500 shadow-sm transition-colors hover:bg-white"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                </div>

                <div className="p-3">
                  <p className="truncate text-sm font-semibold text-foreground">
                    {video.title}
                  </p>
                  {video.caption && (
                    <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                      {video.caption}
                    </p>
                  )}
                </div>

                {isConfirming && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-background/95 p-4 text-center">
                    <AlertTriangle className="size-5 text-red-500" />
                    <p className="text-xs font-semibold text-foreground">
                      Delete &ldquo;{video.title}&rdquo;?
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setConfirmingId(null)}
                        disabled={isDeletingThis}
                        className="rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-semibold transition-colors hover:bg-muted disabled:opacity-50"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleDelete(video.id)}
                        disabled={isDeletingThis}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-red-500 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-red-600 disabled:opacity-50"
                      >
                        {isDeletingThis ? "Deleting..." : "Delete"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {isFormOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          onClick={closeForm}
        >
          <div
            className="glass-panel w-full max-w-lg space-y-5 rounded-2xl border border-border/50 bg-card p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-foreground">
                  {editingVideo ? "Edit Example Video" : "Add Example Video"}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Vertical clip + a one-line &ldquo;why this works&rdquo; caption.
                </p>
              </div>
              <button
                onClick={closeForm}
                disabled={isSaving}
                className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted disabled:opacity-50"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Title
                </label>
                <input
                  autoFocus
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="e.g. Eye-level GRWM in natural light"
                  className="glass-input w-full rounded-lg bg-background/50 px-4 py-2 text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Caption{" "}
                  <span className="normal-case text-muted-foreground/60">
                    — &ldquo;why this works&rdquo;
                  </span>
                </label>
                <textarea
                  value={form.caption}
                  onChange={(e) => setForm((f) => ({ ...f, caption: e.target.value }))}
                  rows={2}
                  maxLength={240}
                  placeholder="Eye-level, natural light, says niche + languages"
                  className="glass-input w-full resize-y rounded-lg bg-background/50 px-4 py-2 text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Video
                  </label>
                  <input
                    ref={videoInputRef}
                    type="file"
                    accept={VIDEO_ACCEPT}
                    className="hidden"
                    onChange={(e) => handleVideoSelect(e.target.files?.[0] ?? null)}
                  />
                  <button
                    type="button"
                    onClick={() => videoInputRef.current?.click()}
                    className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-border px-3 py-2 text-xs font-semibold text-muted-foreground transition-colors hover:bg-muted"
                  >
                    <VideoIcon className="size-3.5" />
                    {videoFile
                      ? videoFile.name
                      : editingVideo
                        ? "Replace video"
                        : "Choose video"}
                  </button>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Poster{" "}
                    <span className="normal-case text-muted-foreground/60">
                      — optional
                    </span>
                  </label>
                  <input
                    ref={posterInputRef}
                    type="file"
                    accept={IMAGE_ACCEPT}
                    className="hidden"
                    onChange={(e) => setPosterFile(e.target.files?.[0] ?? null)}
                  />
                  <button
                    type="button"
                    onClick={() => posterInputRef.current?.click()}
                    className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-border px-3 py-2 text-xs font-semibold text-muted-foreground transition-colors hover:bg-muted"
                  >
                    <ImagePlus className="size-3.5" />
                    {posterFile
                      ? posterFile.name
                      : editingVideo?.thumbnailUrl
                        ? "Replace poster"
                        : "Choose poster"}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Sort order
                  </label>
                  <input
                    type="number"
                    value={form.sortOrder}
                    onChange={(e) => setForm((f) => ({ ...f, sortOrder: e.target.value }))}
                    className="glass-input w-24 rounded-lg bg-background/50 px-3 py-2 text-sm"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Visible
                  </span>
                  <Switch
                    checked={form.active}
                    onCheckedChange={(checked) =>
                      setForm((f) => ({ ...f, active: checked }))
                    }
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                onClick={closeForm}
                disabled={isSaving}
                className="rounded-lg border border-border bg-background px-4 py-2 text-sm font-semibold transition-colors hover:bg-muted disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={isSaving}
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSaving
                  ? "Saving..."
                  : editingVideo
                    ? "Save Changes"
                    : "Add Example"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
