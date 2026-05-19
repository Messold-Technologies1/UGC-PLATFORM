"use client";

import {
  CheckCircle,
  Clapperboard,
  Headphones,
  MessageCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export function NeedHelpCard() {
  return (
    <div className="rounded-2xl border bg-card p-6 shadow-sm text-center">
      <div className="flex justify-center mb-3">
        <div className="flex size-10 items-center justify-center rounded-full bg-muted">
          <Headphones className="size-5 text-muted-foreground" />
        </div>
      </div>
      <h3 className="text-base font-bold text-foreground">Need help?</h3>
      <p className="text-sm text-muted-foreground mt-1">
        Our support team is here to help you.
      </p>
      <Button
        variant="outline"
        className="w-full mt-4 rounded-lg text-sm font-medium"
        disabled
      >
        <MessageCircle className="size-4" />
        Chat with Support
      </Button>
    </div>
  );
}

const TIPS = [
  "Share clear references and examples",
  "Provide all key details in the brief",
  "Ship the product on time (if applicable)",
  "Respond promptly to creator messages",
];

export function TipsCard() {
  return (
    <div className="rounded-2xl border border-primary/15 bg-primary/5 p-6">
      <h3 className="text-sm font-bold text-primary mb-4">
        Tips for a smooth experience
      </h3>
      <div className="space-y-3">
        {TIPS.map((tip) => (
          <div key={tip} className="flex items-start gap-2.5">
            <CheckCircle className="size-4 text-emerald-500 shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground leading-relaxed">
              {tip}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-5 flex justify-center">
        <div className="flex size-24 items-center justify-center rounded-2xl bg-primary/10">
          <Clapperboard className="size-10 text-primary/40" />
        </div>
      </div>
    </div>
  );
}
