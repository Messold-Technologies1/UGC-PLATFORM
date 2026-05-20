"use client";

import { CheckCircle2, Circle, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import type { OrderV2TimelineStep } from "../mock/orders-v2-mock-data";

interface Props {
  steps: OrderV2TimelineStep[];
}

export function OrdersV2Timeline({ steps }: Props) {
  return (
    <div className="flex flex-col gap-0">
      {steps.map((step, i) => (
        <div key={i} className="flex gap-3">
          {/* Icon + connector */}
          <div className="flex flex-col items-center">
            <div
              className={cn(
                "flex size-6 shrink-0 items-center justify-center rounded-full border-2 mt-0.5",
                step.status === "completed"
                  ? "border-primary bg-primary"
                  : step.status === "active"
                    ? "border-primary bg-background"
                    : "border-border bg-background"
              )}
            >
              {step.status === "completed" ? (
                <CheckCircle2 className="size-3.5 text-primary-foreground" />
              ) : step.status === "active" ? (
                <Clock className="size-3 text-primary" />
              ) : (
                <Circle className="size-3 text-muted-foreground/40" />
              )}
            </div>
            {i < steps.length - 1 && (
              <div
                className={cn(
                  "w-0.5 flex-1 my-1 min-h-[20px]",
                  step.status === "completed" ? "bg-primary/40" : "bg-border"
                )}
              />
            )}
          </div>
          {/* Label */}
          <div className="pb-4">
            <p
              className={cn(
                "text-sm font-semibold leading-tight",
                step.status === "pending"
                  ? "text-muted-foreground"
                  : "text-foreground"
              )}
            >
              {step.label}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {step.description}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
