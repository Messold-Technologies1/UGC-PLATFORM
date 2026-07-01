import { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Spinner } from "@/components/ui/spinner";
import { Button } from "@/components/ui/button";
import {
  useMyPortfolioSectionsQuery,
  useAddVideosToSectionMutation,
  useRemoveVideoFromSectionMutation,
} from "../hooks/use-portfolio-sections";

type Props = {
  videoId: string | null;
  onClose: () => void;
};

export function VideoSectionAssignmentModal({ videoId, onClose }: Props) {
  const { data: sections = [], isLoading } = useMyPortfolioSectionsQuery();
  const addMut = useAddVideosToSectionMutation();
  const removeMut = useRemoveVideoFromSectionMutation();

  const initialAssignedSectionIdsStr = useMemo(() => {
    if (!videoId || !sections) return "";
    return sections
      .filter((s) => s.videos.some((v) => v.videoId === videoId))
      .map((s) => s.id)
      .sort()
      .join(",");
  }, [sections, videoId]);

  const [localAssignments, setLocalAssignments] = useState<Set<string>>(
    new Set(),
  );
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!initialAssignedSectionIdsStr) {
      setLocalAssignments(new Set());
      return;
    }
    setLocalAssignments(new Set(initialAssignedSectionIdsStr.split(",")));
  }, [initialAssignedSectionIdsStr]);

  const handleToggle = (sectionId: string, checked: boolean) => {
    setLocalAssignments((prev) => {
      const next = new Set(prev);
      if (checked) next.add(sectionId);
      else next.delete(sectionId);
      return next;
    });
  };

  const handleSave = async () => {
    if (!videoId) return;
    setIsSaving(true);

    try {
      const initialSet = new Set(
        initialAssignedSectionIdsStr
          ? initialAssignedSectionIdsStr.split(",")
          : [],
      );

      const promises = [];

      for (const sectionId of localAssignments) {
        if (!initialSet.has(sectionId)) {
          const section = sections.find((s) => s.id === sectionId);
          const maxPosition =
            section?.videos?.reduce(
              (max, v) => Math.max(max, v.position),
              -1,
            ) ?? -1;
          promises.push(
            addMut.mutateAsync({
              sectionId,
              videos: [{ videoId, position: maxPosition + 1 }],
            }),
          );
        }
      }

      for (const sectionId of initialSet) {
        if (!localAssignments.has(sectionId)) {
          promises.push(
            removeMut.mutateAsync({
              sectionId,
              videoId,
            }),
          );
        }
      }

      await Promise.all(promises);
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const hasChanges = useMemo(() => {
    const initialSet = new Set(
      initialAssignedSectionIdsStr
        ? initialAssignedSectionIdsStr.split(",")
        : [],
    );
    if (initialSet.size !== localAssignments.size) return true;
    for (const item of localAssignments) {
      if (!initialSet.has(item)) return true;
    }
    return false;
  }, [initialAssignedSectionIdsStr, localAssignments]);

  return (
    <Dialog open={!!videoId} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Add to Section</DialogTitle>
        </DialogHeader>

        <div className="py-4">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Spinner className="size-6 text-muted-foreground" />
            </div>
          ) : sections.length === 0 ? (
            <div className="text-center py-8 space-y-2">
              <p className="text-sm text-muted-foreground">
                You haven't created any sections yet.
              </p>
              <p className="text-xs text-muted-foreground">
                Manage sections from your portfolio view to organize your
                videos.
              </p>
            </div>
          ) : (
            <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-2 custom-scrollbar">
              {sections.map((section) => (
                <label
                  key={section.id}
                  htmlFor={`section-${section.id}`}
                  className={`flex flex-row items-center space-x-3 space-y-0 rounded-md border p-4 shadow-sm cursor-pointer transition-colors ${
                    isSaving
                      ? "opacity-50 cursor-not-allowed"
                      : "hover:bg-muted/50"
                  }`}
                >
                  <Checkbox
                    id={`section-${section.id}`}
                    checked={localAssignments.has(section.id)}
                    onCheckedChange={(checked) =>
                      handleToggle(section.id, checked as boolean)
                    }
                    disabled={isSaving}
                  />
                  <div className="space-y-1 leading-none flex-1">
                    <span className="text-sm font-medium leading-none block">
                      {section.name}
                    </span>
                  </div>
                </label>
              ))}
            </div>
          )}
        </div>

        {sections.length > 0 && !isLoading && (
          <DialogFooter>
            <Button variant="outline" onClick={onClose} disabled={isSaving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving || !hasChanges}>
              {isSaving && <Spinner className="size-4 mr-2" />}
              Save Changes
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
