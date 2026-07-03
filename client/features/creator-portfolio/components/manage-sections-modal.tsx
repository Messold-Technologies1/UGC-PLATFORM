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
  Plus,
  Pencil,
  Check,
  X,
  GripVertical,
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
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

function SortableSectionItem({
  section,
  editingId,
  editName,
  setEditName,
  handleSaveEdit,
  setEditingId,
  updateMutPending,
  handleStartEdit,
  handleDelete,
  deleteMutPending,
}: {
  section: PortfolioSectionApi;
  editingId: string | null;
  editName: string;
  setEditName: (val: string) => void;
  handleSaveEdit: (id: string) => void;
  setEditingId: (id: string | null) => void;
  updateMutPending: boolean;
  handleStartEdit: (section: PortfolioSectionApi) => void;
  handleDelete: (id: string) => void;
  deleteMutPending: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: section.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1 : 0,
    position: isDragging ? "relative" : undefined,
  } as React.CSSProperties;

  return (
    <div
      ref={setNodeRef}
      style={style}
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
            disabled={updateMutPending}
          >
            <Check className="size-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="size-8 text-muted-foreground"
            onClick={() => setEditingId(null)}
            disabled={updateMutPending}
          >
            <X className="size-4" />
          </Button>
        </div>
      ) : (
        <div className="flex-1 font-medium text-sm truncate pr-4 flex items-center gap-2">
          <button
            type="button"
            className="cursor-grab hover:text-foreground text-muted-foreground transition-colors active:cursor-grabbing p-1 -ml-1 touch-none"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="size-4" />
          </button>
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
          <Button
            size="icon"
            variant="ghost"
            className="size-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={() => handleDelete(section.id)}
            disabled={deleteMutPending}
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      )}
    </div>
  );
}

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

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

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

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = sections.findIndex((s) => s.id === active.id);
      const newIndex = sections.findIndex((s) => s.id === over.id);

      const newSections = arrayMove(sections, oldIndex, newIndex);
      const payload = newSections.map((s, i) => ({ id: s.id, position: i + 1 }));
      reorderMut.mutate(payload);
    }
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

          <div className="flex flex-col gap-2 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar overflow-x-hidden">
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Spinner className="size-6 text-muted-foreground" />
              </div>
            ) : sections.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No sections created yet.
              </p>
            ) : (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={sections.map((s) => s.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {sections.map((section) => (
                    <SortableSectionItem
                      key={section.id}
                      section={section}
                      editingId={editingId}
                      editName={editName}
                      setEditName={setEditName}
                      handleSaveEdit={handleSaveEdit}
                      setEditingId={setEditingId}
                      updateMutPending={updateMut.isPending}
                      handleStartEdit={handleStartEdit}
                      handleDelete={handleDelete}
                      deleteMutPending={deleteMut.isPending}
                    />
                  ))}
                </SortableContext>
              </DndContext>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
