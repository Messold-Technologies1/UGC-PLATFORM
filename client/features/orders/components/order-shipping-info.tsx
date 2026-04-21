import { Truck, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";

export function OrderShippingInfo() {
  return (
    <section className="bg-card rounded-3xl p-6 md:p-8 border shadow-sm">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex shrink-0 items-center justify-center">
            <Truck className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h2 className="font-heading font-bold text-lg mb-1 text-card-foreground">
              Shipping Information
            </h2>
            <p className="text-muted-foreground text-sm max-w-md">
              The creator needs the physical product to start filming. Ensure the package is dispatched within 48 hours.
            </p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-3">
          <Button variant="outline" className="rounded-xl font-semibold border-border/60 shadow-sm">
            Mark as Shipped
          </Button>
        </div>
      </div>
      <div className="mt-8 p-6 bg-muted/30 rounded-2xl border border-dashed border-border/60">
        <div className="flex items-center gap-2 mb-3">
          <MapPin className="w-4 h-4 text-primary" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-foreground">
            Creator Shipping Address
          </span>
        </div>
        <div className="text-card-foreground font-medium text-sm leading-relaxed">
          Riya Sharma<br />
          Apt 4B, Emerald Heights, Linking Road<br />
          Mumbai, MH 400050<br />
          India
        </div>
      </div>
    </section>
  );
}
