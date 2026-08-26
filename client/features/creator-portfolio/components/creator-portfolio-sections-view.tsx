import { useState } from "react";
import {
  useMyPortfolioSectionsQuery,
  useRemoveVideoFromSectionMutation,
} from "../hooks/use-portfolio-sections";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Spinner } from "@/components/ui/spinner";
import { Button } from "@/components/ui/button";
import {
  Play,
  FolderPlus,
  Trash2,
  ArrowLeft,
  Image as Plus,
} from "lucide-react";
import { BulkAddVideosModal } from "./bulk-add-videos-modal";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

function SectionCover({ videos }: { videos: any[] }) {
  if (videos.length === 0) {
    return (
      <div className="relative aspect-video w-full bg-muted flex flex-col items-center justify-center border-b">
        <FolderPlus className="size-10 text-muted-foreground/30 mb-2" />
      </div>
    );
  }

  const renderMedia = (v: any, className: string = "") => {
    if (v?.thumbnailUrl) {
      return (
        <img
          src={v.thumbnailUrl}
          className={`h-full w-full object-cover ${className}`}
          alt=""
        />
      );
    }
    if (v?.videoUrl) {
      return (
        <video
          src={v.videoUrl}
          className={`h-full w-full object-cover pointer-events-none ${className}`}
          preload="metadata"
          muted
          playsInline
        />
      );
    }
    return <div className={`h-full w-full bg-muted ${className}`} />;
  };

  if (videos.length >= 3) {
    return (
      <div className="relative aspect-video w-full overflow-hidden flex gap-0.5 bg-background border-b p-1">
        <div className="w-2/3 h-full relative overflow-hidden rounded-l-md">
          {renderMedia(
            videos[0],
            "transition-transform duration-500 group-hover:scale-105",
          )}
        </div>
        <div className="w-1/3 h-full flex flex-col gap-0.5">
          <div className="h-1/2 w-full relative overflow-hidden rounded-tr-md">
            {renderMedia(
              videos[1],
              "transition-transform duration-500 group-hover:scale-105",
            )}
          </div>
          <div className="h-1/2 w-full relative overflow-hidden rounded-br-md">
            {renderMedia(
              videos[2],
              "transition-transform duration-500 group-hover:scale-105",
            )}
            {videos.length > 3 && (
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white text-xs font-semibold backdrop-blur-sm">
                +{videos.length - 3}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (videos.length === 2) {
    return (
      <div className="relative aspect-video w-full overflow-hidden flex gap-0.5 bg-background border-b p-1">
        <div className="w-1/2 h-full relative overflow-hidden rounded-l-md">
          {renderMedia(
            videos[0],
            "transition-transform duration-500 group-hover:scale-105",
          )}
        </div>
        <div className="w-1/2 h-full relative overflow-hidden rounded-r-md">
          {renderMedia(
            videos[1],
            "transition-transform duration-500 group-hover:scale-105",
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="relative aspect-video w-full overflow-hidden bg-background border-b p-1">
      <div className="w-full h-full relative overflow-hidden rounded-md">
        {renderMedia(
          videos[0],
          "transition-transform duration-500 group-hover:scale-105",
        )}
      </div>
    </div>
  );
}

export function CreatorPortfolioSectionsView() {
  const { data: sections = [], isLoading } = useMyPortfolioSectionsQuery();

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const selectedSectionId = searchParams?.get("sectionId") || null;

  const setSelectedSectionId = (id: string | null) => {
    const params = new URLSearchParams(searchParams?.toString() || "");
    if (id) {
      params.set("sectionId", id);
    } else {
      params.delete("sectionId");
    }
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const removeMut = useRemoveVideoFromSectionMutation();
  const [videoToRemove, setVideoToRemove] = useState<{
    sectionId: string;
    videoId: string;
  } | null>(null);
  const [isBulkAddModalOpen, setIsBulkAddModalOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="flex min-h-80 items-center justify-center rounded-lg border border-dashed border-border/80 bg-background">
        <Spinner className="size-8 text-muted-foreground" />
      </div>
    );
  }

  if (sections.length === 0) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center rounded-lg border border-dashed border-border/80 bg-background p-6">
        <div className="mb-4 flex size-14 items-center justify-center rounded-lg bg-primary/10">
          <FolderPlus className="size-6 text-primary" />
        </div>
        <p className="text-sm font-medium">No sections created yet</p>
        <p className="mt-1 max-w-sm text-center text-xs text-muted-foreground">
          Group your portfolio into sections like "UGC Ads" or "Testimonials" to
          help brands find exactly what they need.
        </p>
      </div>
    );
  }

  if (selectedSectionId) {
    const section = sections.find((s) => s.id === selectedSectionId);
    if (!section) {
      setSelectedSectionId(null);
      return null;
    }

    return (
      <div className="space-y-6 pb-12">
        <div className="flex items-center gap-4 border-b pb-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSelectedSectionId(null)}
            className="text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-5" />
          </Button>
          <div className="flex-1">
            <h3 className="text-xl font-semibold tracking-tight">
              {section.name}
            </h3>
            <p className="text-sm text-muted-foreground">
              {section.videos.length} items
            </p>
          </div>
          <Button
            onClick={() => setIsBulkAddModalOpen(true)}
            className="gap-2 shrink-0"
          >
            <Plus className="size-4" />
            Add Videos
          </Button>
        </div>

        {section.videos.length === 0 ? (
          <div className="rounded-lg border border-dashed bg-card/50 p-12 text-center text-sm text-muted-foreground">
            This section is empty. Assign videos from the "All Works" tab.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {section.videos.map((v) => {
              const updateDuration = (video: HTMLVideoElement | null) => {
                if (video && video.duration && isFinite(video.duration)) {
                  const minutes = Math.floor(video.duration / 60);
                  const seconds = Math.floor(video.duration % 60);
                  const formatted = `${minutes}:${seconds.toString().padStart(2, "0")}`;
                  const pill =
                    video.parentElement?.querySelector(".duration-pill");
                  if (pill && pill.textContent !== formatted)
                    pill.textContent = formatted;
                }
              };

              return (
                <div
                  key={v.videoId}
                  className="group relative flex flex-col overflow-hidden rounded-xl border border-border bg-card text-left shadow-sm transition-all hover:shadow-md hover:border-primary/30"
                >
                  <div
                    className="relative aspect-video overflow-hidden bg-muted w-full rounded-t-lg group"
                    onMouseEnter={(e) => {
                      const vid = e.currentTarget.querySelector("video");
                      if (vid) vid.setAttribute("controls", "true");
                    }}
                    onMouseLeave={(e) => {
                      const vid = e.currentTarget.querySelector("video");
                      if (vid) vid.removeAttribute("controls");
                    }}
                  >
                    <video
                      className="absolute inset-0 h-full w-full object-cover"
                      src={v.videoUrl}
                      poster={v.thumbnailUrl ?? undefined}
                      preload="metadata"
                      playsInline
                      ref={updateDuration}
                      onLoadedMetadata={(e) => updateDuration(e.currentTarget)}
                      onDurationChange={(e) => updateDuration(e.currentTarget)}
                    />

                    <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/10 transition-opacity duration-300 group-hover:opacity-0">
                      <span className="flex size-10 items-center justify-center rounded-full bg-white/20 shadow-sm backdrop-blur-md">
                        <Play
                          className="ml-0.5 size-4 text-white"
                          aria-hidden
                        />
                      </span>
                    </div>

                    <span className="duration-pill pointer-events-none absolute right-2 top-2 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-medium text-white backdrop-blur-sm transition-opacity duration-300 group-hover:opacity-0">
                      0:00
                    </span>

                    <Button
                      variant="destructive"
                      size="icon"
                      className="absolute top-3 right-3 h-8 w-8 rounded-full opacity-0 translate-y-[-10px] transition-all duration-300 group-hover:opacity-100 group-hover:translate-y-0 shadow-lg"
                      onClick={(e) => {
                        e.stopPropagation();
                        setVideoToRemove({
                          sectionId: section.id,
                          videoId: v.videoId,
                        });
                      }}
                      title="Remove from section"
                      disabled={removeMut.isPending}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <Dialog
          open={!!videoToRemove}
          onOpenChange={(open) => {
            if (!open) setVideoToRemove(null);
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Remove from Section</DialogTitle>
              <DialogDescription>
                Are you sure you want to remove this video from this section? It
                will still remain in your 'All Works' tab.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setVideoToRemove(null)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  if (videoToRemove) {
                    removeMut.mutate({
                      sectionId: videoToRemove.sectionId,
                      videoId: videoToRemove.videoId,
                    });
                    setVideoToRemove(null);
                  }
                }}
              >
                Remove
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <BulkAddVideosModal
          sectionId={selectedSectionId}
          isOpen={isBulkAddModalOpen}
          onClose={() => setIsBulkAddModalOpen(false)}
        />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 pb-12">
      {sections.map((section) => {
        return (
          <div
            key={section.id}
            onClick={() => setSelectedSectionId(section.id)}
            className="group cursor-pointer overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-all hover:shadow-md hover:border-primary/30 flex flex-col"
          >
            <div className="relative">
              <SectionCover videos={section.videos} />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-60 pointer-events-none" />

              <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between text-white pointer-events-none">
                <div className="flex items-center gap-1.5 bg-black/40 backdrop-blur-md px-2 py-1 rounded-md text-xs font-medium shadow-sm">
                  <Play className="size-3" />
                  {section.videos.length}
                </div>
              </div>
            </div>

            <div className="py-3 px-4 flex flex-col items-center bg-card">
              <h3 className="font-semibold text-base tracking-tight group-hover:text-primary transition-colors text-center w-full truncate">
                {section.name}
              </h3>
            </div>
          </div>
        );
      })}
    </div>
  );
}
