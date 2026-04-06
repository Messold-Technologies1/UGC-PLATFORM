"use client";

import { useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/dashboard/page-header";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

export type BrandCampaignBriefDraft = {
  brandName: string;
  productOrService: string;
  industry: string;
  scriptOrInstructions: string;
  onLocation: boolean;
  location: string;
  referenceLinks: string;
  notes: string;
};

export function BrandCampaignBriefForm() {
  const [brandName, setBrandName] = useState("");
  const [productOrService, setProductOrService] = useState("");
  const [industry, setIndustry] = useState("");
  const [scriptOrInstructions, setScriptOrInstructions] = useState("");
  const [onLocation, setOnLocation] = useState(false);
  const [location, setLocation] = useState("");
  const [referenceLinks, setReferenceLinks] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const payload: BrandCampaignBriefDraft = {
      brandName: brandName.trim(),
      productOrService: productOrService.trim(),
      industry: industry.trim(),
      scriptOrInstructions: scriptOrInstructions.trim(),
      onLocation,
      location: location.trim(),
      referenceLinks: referenceLinks.trim(),
      notes: notes.trim(),
    };
    setTimeout(() => {
      setSubmitting(false);
      if (process.env.NODE_ENV === "development") {
        console.debug("[brand brief] payload (not sent yet)", payload);
      }
      toast.success("Brief submitted", {
        description:
          "Not wired to the server yet — hook up your API here when ready.",
      });
    }, 400);
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Campaign brief"
        description="Tell creators what you need."
      />

      <Card>
        <CardHeader>
          <CardTitle>Brief details</CardTitle>
          {}
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="brief-brand-name">Brand name</Label>
              <Input
                id="brief-brand-name"
                value={brandName}
                onChange={(e) => setBrandName(e.target.value)}
                placeholder="e.g. Acme Co."
                autoComplete="organization"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="brief-product">Product / service</Label>
              <Input
                id="brief-product"
                value={productOrService}
                onChange={(e) => setProductOrService(e.target.value)}
                placeholder="What should the content feature?"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="brief-industry">Industry</Label>
              <Input
                id="brief-industry"
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                placeholder="e.g. beauty, SaaS, fitness"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="brief-script">Script / instructions</Label>
              <Textarea
                id="brief-script"
                value={scriptOrInstructions}
                onChange={(e) => setScriptOrInstructions(e.target.value)}
                placeholder="Tone, talking points, do’s and don’ts, CTA…"
                className="min-h-[100px]"
                rows={5}
              />
            </div>

            <div className="flex flex-col gap-4 rounded-xl border border-border/80 bg-muted/30 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="brief-on-location" className="text-foreground">
                  On-location filming
                </Label>
                <p className="text-xs text-muted-foreground">
                  Enable if creators must shoot at a specific place.
                </p>
              </div>
              <Switch
                id="brief-on-location"
                checked={onLocation}
                onCheckedChange={setOnLocation}
                aria-label="On-location filming required"
              />
            </div>

            {onLocation && (
              <div className="space-y-2">
                <Label htmlFor="brief-location">Location</Label>
                <Input
                  id="brief-location"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="City, region, or address"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="brief-refs">Reference links</Label>
              <Textarea
                id="brief-refs"
                value={referenceLinks}
                onChange={(e) => setReferenceLinks(e.target.value)}
                placeholder="One URL per line — mood boards, past ads, product pages…"
                className="min-h-[100px]"
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="brief-notes">Notes</Label>
              <Textarea
                id="brief-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Anything else the creator should know"
                className="min-h-[100px]"
                rows={3}
              />
            </div>

            <Button
              type="submit"
              disabled={submitting}
              className="bg-foreground text-background hover:opacity-90"
            >
              {submitting ? "Submitting…" : "Submit Brief"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
