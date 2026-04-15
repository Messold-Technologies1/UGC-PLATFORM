import { PlayCircle, CheckCircle, FileEdit, CloudUpload, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThumbnailsCarousel } from "@/components/ui/thumbnails-carousel";

interface OrderDeliveryStatusProps {
  role?: "brand" | "creator";
}

export function OrderDeliveryStatus({ role = "brand" }: OrderDeliveryStatusProps) {
  if (role === "creator") {
    return (
      <section className="bg-card rounded-3xl overflow-hidden border shadow-sm relative">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 blur-[100px] -z-10" />
        <div className="p-6 md:p-8">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-secondary/10 flex items-center justify-center text-secondary">
              <CloudUpload className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-bold font-heading text-foreground">Delivery Upload</h2>
          </div>

          <div className="border-2 border-dashed border-border/60 rounded-3xl p-12 flex flex-col items-center justify-center text-center hover:border-primary/50 transition-colors group bg-muted/10 cursor-pointer">
            <div className="w-16 h-16 rounded-full bg-background flex items-center justify-center mb-6 shadow-xl group-hover:scale-110 transition-transform">
              <Upload className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-lg font-bold mb-2 text-foreground">Drag and drop your final cut</h3>
            <p className="text-muted-foreground text-sm mb-8 max-w-xs text-balance">
              High-resolution MP4 or MOV files are preferred for maximum quality.
            </p>
            <Button className="px-8 py-6 rounded-xl font-bold shadow-lg shadow-primary/10 hover:shadow-primary/20 transition-all text-sm">
              Upload Final Video
            </Button>
          </div>

          <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-muted/30 p-4 rounded-2xl border border-border/40 flex flex-col justify-center">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1 font-bold">Aspect Ratio</p>
              <p className="text-sm font-bold text-foreground">9:16 Vertical</p>
            </div>
            <div className="bg-muted/30 p-4 rounded-2xl border border-border/40 flex flex-col justify-center">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1 font-bold">Resolution</p>
              <p className="text-sm font-bold text-foreground">1080p+ Min</p>
            </div>
            <div className="bg-muted/30 p-4 rounded-2xl border border-border/40 flex flex-col justify-center">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1 font-bold">File Size</p>
              <p className="text-sm font-bold text-foreground">Max 500MB</p>
            </div>
            <div className="bg-muted/30 p-4 rounded-2xl border border-border/40 flex flex-col justify-center">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1 font-bold">Duration</p>
              <p className="text-sm font-bold text-foreground">15-45 Sec</p>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="bg-card rounded-3xl overflow-hidden border shadow-sm">
      <div className="p-5 border-b flex items-center justify-between bg-muted/30">
        <div className="flex items-center gap-3">
          <PlayCircle className="w-5 h-5 text-primary" />
          <h2 className="font-heading font-bold text-lg text-foreground">Final Delivery</h2>
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
