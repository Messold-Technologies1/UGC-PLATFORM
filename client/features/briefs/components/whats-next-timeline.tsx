"use client";

import { MessageCircleQuestion } from "lucide-react";
import { Card } from "@/components/ui/card";

interface WhatsNextTimelineProps {
  creatorName?: string;
}

export function WhatsNextTimeline({ creatorName }: WhatsNextTimelineProps) {
  const name = creatorName ?? "the creator";
  const nameCapitalized = creatorName ?? "The creator";

  const steps = [
    {
      title: "You submit the brief",
      description: `We'll notify ${name} about your project`,
      style: "border-2 border-primary/30 bg-white text-foreground",
      lineStyle: "bg-primary/30",
    },
    {
      title: "Creator accepts the order",
      description: `${nameCapitalized} will review and accept your project`,
      style: "bg-primary/10 text-primary",
      lineStyle: "bg-border/60",
    },
    {
      title: "Product ships",
      titleSuffix: "(if applicable)",
      description: `You ship the product to ${name}`,
      style: "bg-muted text-muted-foreground",
      lineStyle: "bg-border/60",
    },
    {
      title: "Content creation",
      description: `${nameCapitalized} creates and uploads the content`,
      style: "bg-muted text-muted-foreground",
      lineStyle: "bg-border/60",
    },
    {
      title: "You review & approve",
      description: "Request revision if needed or approve",
      style: "bg-muted text-muted-foreground",
      lineStyle: "bg-border/60",
    },
    {
      title: "Order completed",
      description: "Payment released to the creator",
      style: "bg-muted text-muted-foreground",
      isLast: true,
    },
  ];

  return (
    <Card className="rounded-2xl border-border/40 shadow-sm bg-white">
      <div className="p-6">
        <h3 className="text-base font-bold mb-6">What&apos;s next?</h3>

        <div className="space-y-0">
          {steps.map((step, index) => (
            <div
              key={index}
              className={`relative pl-10 ${step.isLast ? "" : "pb-6"}`}
            >
              <div
                className={`absolute left-0 top-0 flex size-7 items-center justify-center rounded-full text-xs font-bold z-10 ${step.style}`}
              >
                {index + 1}
              </div>
              {!step.isLast && step.lineStyle && (
                <div
                  className={`absolute left-[13px] top-7 bottom-0 w-px ${step.lineStyle}`}
                />
              )}
              <div>
                <h4 className="font-bold text-sm text-foreground">
                  {step.title}
                  {step.titleSuffix && (
                    <span className="font-normal text-muted-foreground">
                      {" "}
                      {step.titleSuffix}
                    </span>
                  )}
                </h4>
                <p className="text-xs text-muted-foreground mt-1">
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 rounded-xl bg-slate-50/80 p-4 flex gap-3 border border-border/30">
          <MessageCircleQuestion className="size-5 text-foreground shrink-0 mt-0.5" />
          <div>
            <h4 className="font-bold text-sm mb-1 text-foreground">
              Need help?
            </h4>
            <a
              href="#"
              className="text-xs text-primary font-medium hover:underline"
            >
              Chat with our support team
            </a>
          </div>
        </div>
      </div>
    </Card>
  );
}
