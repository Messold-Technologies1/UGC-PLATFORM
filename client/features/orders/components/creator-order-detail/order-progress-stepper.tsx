"use client";

import { Check, XCircle, Package, CheckCircle2, CircleDot, RotateCcw, LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type StepStatus = "completed" | "current" | "pending" | "cancelled" | "revision" | "delivered";

export interface StepDef {
  id: string;
  label: string;
  status: StepStatus;
  date?: string | null;
}

export interface OrderProgressStepperProps {
  steps: StepDef[];
  viewingStepId?: string | null;
}

function fmtDateTime(val?: string | null, skipYear = false): string | null {
  if (!val) return null;
  try {
    const options: Intl.DateTimeFormatOptions = {
      day: "numeric",
      month: "short",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    };
    if (!skipYear) {
      options.year = "numeric";
    }
    return new Intl.DateTimeFormat("en-GB", options).format(new Date(val));
  } catch {
    return null;
  }
}

function getStepIcon(id: string, status: StepStatus): LucideIcon {
  if (status === "completed" || status === "delivered") return Check;
  if (status === "cancelled") return XCircle;
  if (status === "revision") return RotateCcw;

  switch (id) {
    case "accepted":
      return Check;
    case "awaiting_shipment":
    case "product_received":
      return Package;
    case "in_progress":
      return CheckCircle2;
    case "delivered":
    case "completed":
      return CircleDot;
    default:
      return CircleDot;
  }
}

export function OrderProgressStepper({
  steps,
  viewingStepId,
}: OrderProgressStepperProps) {
  return (
    <div className="flex items-start w-full py-4 overflow-x-auto hide-scrollbar">
      {steps.map((step, i) => {
        const isViewing = step.id === viewingStepId;

        const Icon = getStepIcon(step.id, step.status);

        let lineColor = "bg-border/50";
        if (step.status === "completed" || step.status === "delivered") {
          lineColor = "bg-[#4F966B]";
        } else if (step.status === "current") {
          lineColor = "bg-[#4318FF]/40";
        } else if (step.status === "cancelled") {
          lineColor = "bg-red-500/40";
        } else if (step.status === "revision") {
          lineColor = "bg-orange-500/40";
        }

        return (
          <div
            key={step.id}
            className="flex items-start relative flex-1"
          >
            {i < steps.length - 1 && (
              <div className="absolute top-[17px] left-[50%] w-full z-0 pointer-events-none">
                <div
                  className={cn(
                    "h-[2px] w-full transition-colors",
                    lineColor
                  )}
                />
              </div>
            )}

            <div className="flex flex-col items-center w-full relative z-10">
              <div
                className="flex flex-col items-center outline-none bg-transparent border-none p-0 m-0 cursor-default"
                aria-label={`${step.label} – ${step.status}`}
              >
                <div
                  className={cn(
                    "relative w-9 h-9 rounded-full flex items-center justify-center transition-all duration-200 shrink-0 border-2",
                    (step.status === "completed" || step.status === "delivered") &&
                      "bg-[#4F966B] border-[#4F966B] text-white",
                    step.status === "current" &&
                      "bg-[#4318FF] border-[#4318FF] text-white shadow-md shadow-[#4318FF]/25",
                    step.status === "cancelled" &&
                      "bg-red-500 border-red-500 text-white shadow-md shadow-red-500/25",
                    step.status === "revision" &&
                      "bg-orange-500 border-orange-500 text-white shadow-md shadow-orange-500/25",
                    step.status === "pending" &&
                      "bg-background border-muted-foreground/30 text-muted-foreground/40",
                    isViewing &&
                      (step.status === "completed" || step.status === "delivered") &&
                      "ring-2 ring-[#4F966B]/50",
                    isViewing &&
                      step.status === "current" &&
                      "ring-2 ring-[#4318FF]/50",
                  )}
                >
                  <Icon className={cn("w-[18px] h-[18px]", step.status === "completed" ? "stroke-[3]" : "stroke-[2.5]")} />
                </div>

                <span
                  className={cn(
                    "mt-3 text-[11px] font-semibold text-center leading-tight whitespace-nowrap transition-colors",
                    (step.status === "completed" || step.status === "delivered") && "text-[#4F966B]",
                    step.status === "current" && "text-[#4318FF]",
                    step.status === "cancelled" && "text-red-600",
                    step.status === "revision" && "text-orange-600",
                    step.status === "pending" && "text-muted-foreground/60",
                  )}
                >
                  {step.label}
                </span>

                {step.date && step.status !== "pending" && (
                  <span className="mt-1 text-[10px] text-muted-foreground/80 text-center whitespace-nowrap">
                    {step.status === "current"
                      ? `Since ${fmtDateTime(step.date, true)}`
                      : fmtDateTime(step.date)}
                  </span>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
