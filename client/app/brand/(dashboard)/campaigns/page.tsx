import type { Metadata } from "next";
import { PageHeader } from "@/components/dashboard/page-header";
import { Button } from "@/components/ui/button";
import { Plus, Megaphone } from "lucide-react";

export const metadata: Metadata = { title: "Campaigns" };

export default function BrandCampaignsPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Campaigns"
        description="Create and manage your UGC campaigns"
      >
        <Button data-tour="brand-campaigns-create" size="sm" className="gap-1.5 bg-foreground border-0 text-background hover:opacity-90">
          <Plus className="size-3.5" />
          New Campaign
        </Button>
      </PageHeader>

      <div className="flex min-h-[400px] flex-col items-center justify-center rounded-2xl border border-dashed border-border/80 bg-card">
        <div className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-primary/10">
          <Megaphone className="size-6 text-primary" />
        </div>
        <p className="text-sm font-medium">No campaigns created yet</p>
        <p className="mt-1 max-w-xs text-center text-xs text-muted-foreground">
          Create your first campaign to start receiving UGC from talented creators.
        </p>
        <Button size="sm" className="mt-4 gap-1.5 bg-foreground border-0 text-background hover:opacity-90">
          <Plus className="size-3.5" />
          Create your first campaign
        </Button>
      </div>
    </div>
  );
}
