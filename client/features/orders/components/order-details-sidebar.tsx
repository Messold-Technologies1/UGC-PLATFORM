/* eslint-disable @next/next/no-img-element */
import { Package, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";

export function OrderDetailsSidebar() {
  return (
    <aside className="no-scrollbar flex w-80 shrink-0 flex-col overflow-y-auto border-l border-border bg-background p-6">
      <h3 className="mb-6 font-heading text-sm font-extrabold tracking-[0.2em] text-muted-foreground uppercase">
        Order Details
      </h3>

      <div className="mb-6 rounded-2xl border border-border/50 bg-secondary/10 p-5">
        <div className="mb-4 flex items-start justify-between">
          <span className="rounded bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-400">
            In Progress
          </span>
          <span className="font-heading font-bold text-primary">$400</span>
        </div>
        <h4 className="mb-1 font-heading text-lg font-bold leading-tight text-foreground">
          Brand Storyteller
        </h4>
        <p className="mb-4 text-xs text-muted-foreground">
          High-fidelity 60s video with narrative storytelling and sound design.
        </p>

        <div className="flex items-center gap-3 border-t border-border/50 py-3">
          <Package className="h-4 w-4 text-secondary" />
          <div>
            <div className="text-[10px] uppercase text-muted-foreground">
              Product
            </div>
            <div className="text-xs font-semibold text-foreground/90">
              Prism Essence Mask
            </div>
          </div>
        </div>
        <Button className="mt-4 w-full gap-2" variant="outline" size="sm">
          <FileText className="h-4 w-4" />
          View Brief
        </Button>
      </div>

      <div className="mb-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-heading text-[10px] font-extrabold uppercase tracking-[0.2em] text-muted-foreground">
            Shared Assets
          </h3>
          <button className="text-[10px] text-primary hover:underline">
            See All
          </button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="group relative aspect-4/3 overflow-hidden rounded-lg border border-border bg-muted">
            <img
              alt="Asset 1"
              className="h-full w-full object-cover opacity-60 transition-opacity group-hover:opacity-100"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuDoMGH-dbPKRgJ--Dx-m8H9D35I54qDFf4Pr5SzYl-3QlXwcJA95Ol7rnuvTX-hz_funegtBX6Ybq2cN4PtUnz23nSkNomohk8-Vhycd4ti6JeOvO2TVpLOrGtpa0wFCEGufgES3WCqrRbyiStC9knRNk0lDUzGNk8YbtB842xm24dasHaAN_4aqGY1utSEZIgrwB0XlLe7cO6dXN8n0vS38DcmyO4L6T6ElW7EtcLfLNxpsJCH3NKVMHh1HpY4OWcCMc1uWOfZtL8"
            />
            <div className="absolute inset-x-0 bottom-0 translate-y-full transform bg-black/60 p-2 backdrop-blur-sm transition-transform group-hover:translate-y-0">
              <p className="truncate text-[8px] text-white/90">
                Brand_Guidelines.pdf
              </p>
            </div>
          </div>
          <div className="group relative aspect-4/3 overflow-hidden rounded-lg border border-border bg-muted">
            <div className="flex h-full w-full flex-col items-center justify-center text-muted-foreground/50">
              <FileText className="h-6 w-6" />
              <span className="mt-1 text-[8px] font-bold">SCRIPT_V1</span>
            </div>
            <div className="absolute inset-x-0 bottom-0 translate-y-full transform bg-black/60 p-2 backdrop-blur-sm transition-transform group-hover:translate-y-0">
              <p className="truncate text-[8px] text-white/90">
                Script_V1_Final.docx
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-auto border-t border-border pt-6">
        <h3 className="mb-4 font-heading text-[10px] font-extrabold uppercase tracking-[0.2em] text-muted-foreground">
          Timeline
        </h3>
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="mt-1 h-2 w-2 rounded-full bg-emerald-500" />
            <div>
              <div className="text-xs font-semibold text-foreground">
                Payment Received
              </div>
              <div className="text-[10px] text-muted-foreground">
                Today, 09:45 AM
              </div>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="mt-1 h-2 w-2 rounded-full border-2 border-border" />
            <div>
              <div className="text-xs text-foreground/80">Script Approval</div>
              <div className="text-[10px] text-muted-foreground">Pending</div>
            </div>
          </div>
          <div className="flex items-start gap-3 opacity-50">
            <div className="mt-1 h-2 w-2 rounded-full border-2 border-border" />
            <div>
              <div className="text-xs text-foreground/80">Final Delivery</div>
              <div className="text-[10px] text-muted-foreground">
                Target: Jan 31
              </div>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
