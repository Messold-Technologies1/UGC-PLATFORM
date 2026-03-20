import { PageHeader } from "@/components/dashboard/page-header";
import { Button } from "@/components/ui/button";
import { Plus, Image } from "lucide-react";

export default function CreatorPortfolioPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Portfolio"
        description="Showcase your best work to attract brands"
      >
        <Button size="sm" className="gap-1.5 bg-foreground border-0 text-background hover:opacity-90">
          <Plus className="size-3.5" />
          Add Work
        </Button>
      </PageHeader>

      <div className="flex min-h-[400px] flex-col items-center justify-center rounded-2xl border border-dashed border-border/80 bg-card">
        <div className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-primary/10">
          <Image className="size-6 text-primary" />
        </div>
        <p className="text-sm font-medium">Your portfolio is empty</p>
        <p className="mt-1 max-w-xs text-center text-xs text-muted-foreground">
          Upload videos, images, and links to your best UGC content to attract brand deals.
        </p>
        <Button size="sm" className="mt-4 gap-1.5 bg-foreground border-0 text-background hover:opacity-90">
          <Plus className="size-3.5" />
          Upload your first piece
        </Button>
      </div>
    </div>
  );
}
