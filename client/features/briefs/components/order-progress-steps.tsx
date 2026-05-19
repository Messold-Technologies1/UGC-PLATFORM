"use client";

import { Check } from "lucide-react";

const STEPS = ["Payment", "Briefing", "Review", "Creator Acceptance"] as const;

interface OrderProgressStepsProps {
  currentStep?: number;
}

export function OrderProgressSteps({ currentStep = 1 }: OrderProgressStepsProps) {
  return (
    <div className="bg-white px-6 py-4 flex flex-wrap items-center justify-center gap-y-2 text-sm font-medium">
      {STEPS.map((label, index) => {
        const isCompleted = index < currentStep;
        const isActive = index === currentStep;

        return (
          <div key={label} className="flex items-center">
            {index > 0 && (
              <div className="h-[2px] w-8 sm:w-12 bg-border/40 mx-2 sm:mx-4" />
            )}
            <div
              className={`flex items-center gap-2 ${
                isCompleted
                  ? "text-emerald-600"
                  : isActive
                    ? "text-primary"
                    : "text-muted-foreground"
              }`}
            >
              <div
                className={`flex size-6 shrink-0 items-center justify-center rounded-full text-white ${
                  isCompleted
                    ? "bg-emerald-500"
                    : isActive
                      ? "bg-primary"
                      : "bg-muted text-muted-foreground"
                }`}
              >
                {isCompleted ? (
                  <Check className="size-4" />
                ) : (
                  <span className={isActive ? "text-white" : "text-muted-foreground"}>
                    {index + 1}
                  </span>
                )}
              </div>
              {label}
            </div>
          </div>
        );
      })}
    </div>
  );
}
