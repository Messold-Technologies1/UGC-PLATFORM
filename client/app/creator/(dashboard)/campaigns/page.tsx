import type { Metadata } from "next";
import { PageHeader } from "@/components/dashboard/page-header";
import { Button } from "@/components/ui/button";
import { Search, Megaphone, Filter } from "lucide-react";

export const metadata: Metadata = { title: "Campaigns" };

export default function CreatorCampaignsPage() {
  return (
    <div className="space-y-8 pt-4 lg:pt-5">
      <PageHeader
        title="Campaigns"
        description="Browse and apply to brand campaigns"
      >
        <Button variant="outline" size="sm" className="gap-1.5">
          <Filter className="size-3.5" />
          Filters
        </Button>
        <Button variant="outline" size="sm" className="gap-1.5">
          <Search className="size-3.5" />
          Search
        </Button>
      </PageHeader>

      <div className="flex min-h-[400px] flex-col items-center justify-center rounded-2xl border border-dashed border-border/80 bg-card">
        <div className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-primary/10">
          <Megaphone className="size-6 text-primary" />
        </div>
        <p className="text-sm font-medium">No campaigns available yet</p>
        <p className="mt-1 max-w-xs text-center text-xs text-muted-foreground">
          New campaigns from brands will appear here. Check back soon!
        </p>
      </div>
    </div>
  );
}
