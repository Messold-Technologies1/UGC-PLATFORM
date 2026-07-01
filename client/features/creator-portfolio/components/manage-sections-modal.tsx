import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Trash2,
  ArrowUp,
  ArrowDown,
  Plus,
  Pencil,
  Check,
  X,
} from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import {
  useMyPortfolioSectionsQuery,
  useCreatePortfolioSectionMutation,
  useDeletePortfolioSectionMutation,
  useReorderPortfolioSectionsMutation,
  useUpdatePortfolioSectionMutation,
} from "../hooks/use-portfolio-sections";
import type { PortfolioSectionApi } from "../api/types";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function ManageSectionsModal({ open, onOpenChange }: Props) {
  const { data: sections = [], isLoading } = useMyPortfolioSectionsQuery();
  const createMut = useCreatePortfolioSectionMutation();
  const deleteMut = useDeletePortfolioSectionMutation();
  const updateMut = useUpdatePortfolioSectionMutation();
  const reorderMut = useReorderPortfolioSectionsMutation();

  const [newSectionName, setNewSectionName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  const handleCreate = () => {
    if (!newSectionName.trim()) return;
    createMut.mutate(
      { name: newSectionName.trim() },
      {
        onSuccess: () => setNewSectionName(""),
      },
    );
  };

  const handleDelete = (id: string) => {
    if (
      confirm(
        "Are you sure you want to delete this section? The videos will remain in your portfolio.",
      )
    ) {
      deleteMut.mutate({ id });
    }
  };

  const handleStartEdit = (section: PortfolioSectionApi) => {
    setEditingId(section.id);
    setEditName(section.name);
  };

  const handleSaveEdit = (id: string) => {
    if (!editName.trim()) return;
    updateMut.mutate(
      { id, name: editName.trim() },
      {
        onSuccess: () => setEditingId(null),
      },
    );
  };

  const handleMove = (index: number, direction: "up" | "down") => {
    if (direction === "up" && index === 0) return;
    if (direction === "down" && index === sections.length - 1) return;

    const newSections = [...sections];
    const targetIndex = direction === "up" ? index - 1 : index + 1;

    const temp = newSections[index];
    newSections[index] = newSections[targetIndex];
    newSections[targetIndex] = temp;

    const payload = newSections.map((s, i) => ({ id: s.id, position: i + 1 }));
    reorderMut.mutate(payload);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Manage Portfolio Sections</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 pt-4">
          <div className="flex gap-2">
            <Input
              placeholder="New section name (e.g. Testimonials, UGC Ads)"
              value={newSectionName}
              onChange={(e) => setNewSectionName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCreate();
              }}
              disabled={sections.length >= 10 || createMut.isPending}
            />
            <Button
              onClick={handleCreate}
              disabled={
                !newSectionName.trim() ||
                sections.length >= 10 ||
                createMut.isPending
              }
              className="gap-2 shrink-0"
            >
              {createMut.isPending ? (
                <Spinner className="size-4" />
              ) : (
                <Plus className="size-4" />
              )}
              Create
            </Button>
          </div>
          {sections.length >= 10 && (
            <p className="text-xs text-destructive -mt-4">
              Maximum of 10 sections reached.
            </p>
          )}

          <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Spinner className="size-6 text-muted-foreground" />
              </div>
            ) : sections.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No sections created yet.
              </p>
            ) : (
              sections.map((section, idx) => (
                <div
                  key={section.id}
                  className="flex items-center justify-between p-3 border rounded-lg bg-card"
                >
                  {editingId === section.id ? (
                    <div className="flex items-center gap-2 flex-1 mr-4">
                      <Input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleSaveEdit(section.id);
                          if (e.key === "Escape") setEditingId(null);
                        }}
                        autoFocus
                        className="h-8"
                      />
                      <Button
                        size="icon"
                        variant="ghost"
                        className="size-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                        onClick={() => handleSaveEdit(section.id)}
                        disabled={updateMut.isPending}
                      >
                        <Check className="size-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="size-8 text-muted-foreground"
                        onClick={() => setEditingId(null)}
                        disabled={updateMut.isPending}
                      >
                        <X className="size-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex-1 font-medium text-sm truncate pr-4">
                      {section.name}
                    </div>
                  )}

                  {editingId !== section.id && (
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="size-8 text-muted-foreground"
                        onClick={() => handleStartEdit(section)}
                      >
                        <Pencil className="size-3.5" />
                      </Button>
                      <div className="flex flex-col gap-0 border-x px-1 mx-1">
                        <button
                          className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:hover:text-muted-foreground transition-colors"
                          disabled={idx === 0 || reorderMut.isPending}
                          onClick={() => handleMove(idx, "up")}
                        >
                          <ArrowUp className="size-3.5" />
                        </button>
                        <button
                          className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:hover:text-muted-foreground transition-colors"
                          disabled={
                            idx === sections.length - 1 || reorderMut.isPending
                          }
                          onClick={() => handleMove(idx, "down")}
                        >
                          <ArrowDown className="size-3.5" />
                        </button>
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="size-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => handleDelete(section.id)}
                        disabled={deleteMut.isPending}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
