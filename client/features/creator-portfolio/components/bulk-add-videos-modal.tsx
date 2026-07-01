import { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
import { Button } from "@/components/ui/button";
import { Check, Play, Image as ImageIcon } from "lucide-react";
import {
  useMyPortfolioSectionsQuery,
  useAddVideosToSectionMutation,
  useRemoveVideoFromSectionMutation,
} from "../hooks/use-portfolio-sections";
import { useMyPortfolioVideosQuery } from "../hooks/use-my-portfolio-videos-query";

type Props = {
  sectionId: string | null;
  isOpen: boolean;
  onClose: () => void;
};

export function BulkAddVideosModal({ sectionId, isOpen, onClose }: Props) {
  const { data: sections = [], isLoading: loadingSections } =
    useMyPortfolioSectionsQuery();
  const { data: allVideos = [], isLoading: loadingVideos } =
    useMyPortfolioVideosQuery();
  const addMut = useAddVideosToSectionMutation();
  const removeMut = useRemoveVideoFromSectionMutation();

  const isLoading = loadingSections || loadingVideos;

  const currentSection = useMemo(
    () => sections.find((s) => s.id === sectionId),
    [sections, sectionId],
  );

  const initialVideoIds = useMemo(() => {
    if (!currentSection) return new Set<string>();
    return new Set(currentSection.videos.map((v) => v.videoId));
  }, [currentSection]);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setSelectedIds(new Set(initialVideoIds));
    }
  }, [isOpen, initialVideoIds]);

  const toggleSelection = (videoId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(videoId)) {
        next.delete(videoId);
      } else {
        next.add(videoId);
      }
      return next;
    });
  };

  const handleSave = async () => {
    if (!sectionId) return;
    setIsSaving(true);

    try {
      const videosToAdd = Array.from(selectedIds)
        .filter((id) => !initialVideoIds.has(id))
        .map((videoId) => ({ videoId }));

      const videosToRemove = Array.from(initialVideoIds).filter(
        (id) => !selectedIds.has(id),
      );

      const promises = [];

      if (videosToAdd.length > 0) {
        const maxPosition =
          currentSection?.videos?.reduce(
            (max, v) => Math.max(max, v.position),
            -1,
          ) ?? -1;

        const videosWithPositions = videosToAdd.map((v, i) => ({
          videoId: v.videoId,
          position: maxPosition + 1 + i,
        }));

        promises.push(
          addMut.mutateAsync({
            sectionId,
            videos: videosWithPositions,
          }),
        );
      }

      if (videosToRemove.length > 0) {
        for (const videoId of videosToRemove) {
          promises.push(
            removeMut.mutateAsync({
              sectionId,
              videoId,
            }),
          );
        }
      }

      if (promises.length > 0) {
        await Promise.all(promises);
      }
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const hasChanges = useMemo(() => {
    if (initialVideoIds.size !== selectedIds.size) return true;
    for (const id of selectedIds) {
      if (!initialVideoIds.has(id)) return true;
    }
    return false;
  }, [initialVideoIds, selectedIds]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[1100px] max-h-[85vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="px-6 py-4 border-b shrink-0">
          <DialogTitle>Manage Section Videos</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar min-h-0">
          {isLoading ? (
            <div className="flex justify-center items-center h-40">
              <Spinner className="size-6 text-muted-foreground" />
            </div>
          ) : allVideos.length === 0 ? (
            <div className="text-center py-12 space-y-2">
              <p className="text-sm text-muted-foreground">
                You haven't uploaded any videos yet.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {allVideos.map((video) => {
                const isSelected = selectedIds.has(video.id);
                return (
                  <div
                    key={video.id}
                    onClick={() => !isSaving && toggleSelection(video.id)}
                    className={`relative group cursor-pointer rounded-lg overflow-hidden border-2 transition-all duration-200 h-full ${
                      isSelected
                        ? "border-primary shadow-md ring-2 ring-primary/20"
                        : "border-transparent hover:border-border"
                    }`}
                  >
                    <div className="w-full relative aspect-[9/16] bg-muted flex flex-col">
                      <video
                        className="absolute inset-0 w-full h-full object-cover"
                        src={video.videoUrl}
                        poster={video.thumbnailUrl || undefined}
                        preload="metadata"
                        muted
                        playsInline
                      />

                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-100 pointer-events-none" />

                      <div className="absolute top-3 right-3 z-10 transition-transform duration-200">
                        {isSelected ? (
                          <div className="flex items-center justify-center w-6 h-6 bg-primary text-primary-foreground rounded-full shadow-lg scale-110">
                            <Check className="size-4" strokeWidth={3} />
                          </div>
                        ) : (
                          <div className="w-6 h-6 rounded-full border-2 border-white/80 bg-black/30 shadow-sm group-hover:border-white transition-colors" />
                        )}
                      </div>

                      <div className="absolute bottom-3 left-3 right-3 text-white pointer-events-none">
                        <div className="flex items-center gap-1.5 mb-1 bg-black/40 backdrop-blur-md w-fit px-2 py-0.5 rounded text-[10px] font-medium">
                          <Play className="size-2.5" />
                          Video
                        </div>
                        <p className="text-xs font-medium line-clamp-2 leading-tight drop-shadow-md">
                          {video.description || "Untitled Video"}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {!isLoading && (
          <DialogFooter className="p-6 border-t bg-muted/20">
            <Button variant="outline" onClick={onClose} disabled={isSaving}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={isSaving || !hasChanges}
              className="min-w-[120px]"
            >
              {isSaving ? (
                <Spinner className="size-4 mr-2" />
              ) : (
                `Save Changes (${selectedIds.size})`
              )}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
