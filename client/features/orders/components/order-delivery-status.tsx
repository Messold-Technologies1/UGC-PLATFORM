import { PlayCircle, CheckCircle, FileEdit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThumbnailsCarousel } from "@/components/ui/thumbnails-carousel";

export function OrderDeliveryStatus() {
  return (
    <section className="bg-card rounded-3xl overflow-hidden border shadow-sm">
      <div className="p-5 border-b flex items-center justify-between bg-muted/30">
        <div className="flex items-center gap-3">
          <PlayCircle className="w-5 h-5 text-primary" />
          <h2 className="font-heading font-bold text-lg">Final Delivery</h2>
        </div>
      </div>
      <div className="p-6 md:p-8">
        <ThumbnailsCarousel />
        <div className="mt-8 flex flex-col sm:flex-row items-center gap-4">
          <Button className="w-full sm:flex-1 py-6 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-primary/10">
            <CheckCircle className="w-5 h-5" />
            Approve & Release Funds
          </Button>
          <Button variant="outline" className="w-full sm:w-auto px-8 py-6 rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-muted/50 border-border/60">
            <FileEdit className="w-5 h-5" />
            Request Revision
          </Button>
        </div>
      </div>
    </section>
  );
}
