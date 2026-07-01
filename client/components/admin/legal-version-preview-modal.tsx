import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useAdminLegalPageVersionQuery } from "@/features/admin/hooks/use-admin-legal-pages-query";
import { useRestoreLegalPageVersionMutation } from "@/features/admin/hooks/use-admin-legal-page-mutations";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { AlertCircle } from "lucide-react";
import { LegalPageHeader } from "@/components/legal/legal-page-header";
import { TableOfContents, type TocItem } from "@/components/legal/table-of-contents";
import { LegalSectionRenderer } from "@/components/legal/legal-section-renderer";

interface LegalVersionPreviewModalProps {
  slug: string;
  versionId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onRestoreSuccess?: () => void;
}

export function LegalVersionPreviewModal({
  slug,
  versionId,
  isOpen,
  onClose,
  onRestoreSuccess,
}: LegalVersionPreviewModalProps) {
  const { data: version, isLoading, isError } = useAdminLegalPageVersionQuery(
    slug,
    versionId
  );
  const restoreMutation = useRestoreLegalPageVersionMutation(slug);

  const handleRestore = () => {
    if (!versionId) return;
    restoreMutation.mutate(versionId, {
      onSuccess: () => {
        onClose();
        onRestoreSuccess?.();
      },
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[90vw] lg:max-w-7xl max-h-[90vh] flex flex-col overflow-hidden p-0 bg-card glass-panel border-border/50">
        <DialogHeader className="px-6 pt-6 pb-2 flex-shrink-0">
          <DialogTitle>Version Preview</DialogTitle>
          <DialogDescription>
            Previewing the exact content of this version. Restoring it will overwrite your active draft.
          </DialogDescription>
        </DialogHeader>

        <div id="version-preview-scroll-container" className="flex-1 overflow-y-auto px-6 py-4 space-y-8 relative">
          {isLoading && (
            <div className="space-y-4">
              <Skeleton className="h-10 w-3/4" />
              <Skeleton className="h-6 w-1/4" />
              <Skeleton className="h-32 w-full mt-8" />
            </div>
          )}

          {isError && !isLoading && (
            <div className="rounded-2xl border border-destructive/20 bg-destructive/10 p-6 flex items-center gap-3 text-destructive">
              <AlertCircle className="size-5" />
              <p>Failed to load this version's snapshot.</p>
            </div>
          )}

          {version && !isLoading && (
            <div className="space-y-8">
              <LegalPageHeader
                title={version.snapshot.title}
                description={version.snapshot.description}
                effectiveDate={version.snapshot.effectiveDate}
                lastUpdated={format(new Date(version.createdAt), "MMM d, yyyy")}
              />

              <div className="grid gap-10 lg:grid-cols-[1fr_260px]">
                <article className="min-w-0">
                  {version.snapshot.sections.length === 0 ? (
                    <p className="text-muted-foreground italic text-sm">
                      No sections in this version.
                    </p>
                  ) : (
                    <LegalSectionRenderer 
                      sections={version.snapshot.sections.map(s => ({
                        ...s,
                        id: s.anchorId
                      }))} 
                    />
                  )}
                </article>
                <TableOfContents 
                  items={version.snapshot.sections.map((s) => ({
                    id: s.anchorId,
                    label: s.tocLabel,
                  }))} 
                  isModal={true}
                />
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex-shrink-0 px-6 py-4 border-t border-border/50 bg-muted/20">
          <Button variant="ghost" onClick={onClose} disabled={restoreMutation.isPending}>
            Cancel
          </Button>
          <Button
            onClick={handleRestore}
            disabled={!version || isLoading || restoreMutation.isPending}
            className="gap-2"
          >
            {restoreMutation.isPending ? "Restoring..." : "Restore this version"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
