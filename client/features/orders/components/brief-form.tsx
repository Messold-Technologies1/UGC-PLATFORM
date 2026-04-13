"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";

export function BriefForm({ orderId }: { orderId: string }) {
  return (
    <form className="space-y-6 bg-card border border-border/40 p-6 rounded-2xl shadow-sm">
      <h3 className="text-sm font-bold tracking-tight text-foreground -mt-1">
        Brief details
      </h3>

      <div className="space-y-2">
        <Label htmlFor="brandName" className="text-[11px] font-bold text-foreground tracking-wide">
          Brand name
        </Label>
        <Input
          id="brandName"
          placeholder="e.g. Acme Co."
          className="h-10 bg-background rounded-lg border-border/50 focus-visible:ring-primary/20 text-xs placeholder:text-muted-foreground/50 transition-colors shadow-none"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="productService" className="text-[11px] font-bold text-foreground tracking-wide">
          Product / service
        </Label>
        <Input
          id="productService"
          placeholder="What should the content feature?"
          className="h-10 bg-background rounded-lg border-border/50 focus-visible:ring-primary/20 text-xs placeholder:text-muted-foreground/50 transition-colors shadow-none"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="industry" className="text-[11px] font-bold text-foreground tracking-wide">
          Industry
        </Label>
        <Input
          id="industry"
          placeholder="e.g. beauty, SaaS, fitness"
          className="h-10 bg-background rounded-lg border-border/50 focus-visible:ring-primary/20 text-xs placeholder:text-muted-foreground/50 transition-colors shadow-none"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="instructions" className="text-[11px] font-bold text-foreground tracking-wide">
          Script / instructions
        </Label>
        <Textarea
          id="instructions"
          placeholder="Tone, talking points, do's and don'ts, CTA..."
          className="min-h-25 resize-none bg-background rounded-lg border-border/50 focus-visible:ring-primary/20 p-3 text-xs placeholder:text-muted-foreground/50 transition-colors shadow-none"
        />
      </div>

      <div className="flex flex-row items-center justify-between rounded-lg border border-border/40 bg-background/50 p-4 shadow-none">
        <div className="space-y-0.5">
          <Label className="text-[11px] font-bold text-foreground tracking-wide">
            On-location filming
          </Label>
          <p className="text-[10px] text-muted-foreground leading-tight">
            Enable if creators must shoot at a specific place.
          </p>
        </div>
        <Switch />
      </div>

      <div className="space-y-2">
        <Label htmlFor="links" className="text-[11px] font-bold text-foreground tracking-wide">
          Reference links
        </Label>
        <Textarea
          id="links"
          placeholder="One URL per line — mood boards, past ads, product pages..."
          className="min-h-20 resize-none bg-background rounded-lg border-border/50 focus-visible:ring-primary/20 p-3 text-xs placeholder:text-muted-foreground/50 transition-colors shadow-none"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes" className="text-[11px] font-bold text-foreground tracking-wide">
          Notes
        </Label>
        <Textarea
          id="notes"
          placeholder="Anything else the creator should know"
          className="min-h-20 resize-none bg-background rounded-lg border-border/50 focus-visible:ring-primary/20 p-3 text-xs placeholder:text-muted-foreground/50 transition-colors shadow-none"
        />
      </div>

      <Button type="button" className="w-full">
        Submit Brief
      </Button>
    </form>
  );
}
