"use client";

import { useCallback, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  useCreatorProfileFormState,
  type UseCreatorProfileFormStateOptions,
} from "@/features/creators/hooks/use-creator-profile-form-state";
import { CreatorOnboardingStepBasic } from "./creator-onboarding-step-basic";
import { CreatorOnboardingStepProfile } from "./creator-onboarding-step-profile";
import { CreatorOnboardingStepPackages } from "./creator-onboarding-step-packages";
import { CreatorOnboardingStepReview } from "./creator-onboarding-step-review";

const STEPS = [
  { key: "basic", label: "Basic Info" },
  { key: "profile", label: "Profile Details" },
  { key: "packages", label: "Packages" },
  { key: "review", label: "Review" },
] as const;

type StepIndex = 0 | 1 | 2 | 3;

const slideVariants = {
  enter: (dir: number) => ({ x: dir > 0 ? 60 : -60, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir > 0 ? -60 : 60, opacity: 0 }),
};

export function CreatorOnboardingStepperForm(
  props: UseCreatorProfileFormStateOptions,
) {
  const form = useCreatorProfileFormState(props);
  const [currentStep, setCurrentStep] = useState<StepIndex>(0);
  const [direction, setDirection] = useState(1);

  const goTo = useCallback(
    (step: StepIndex) => {
      setDirection(step > currentStep ? 1 : -1);
      setCurrentStep(step);
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
    [currentStep],
  );

  const validateStep = useCallback(
    (step: StepIndex): boolean => {
      if (step === 0) {
        if (!form.displayName.trim()) {
          toast.error("Full name is required.");
          return false;
        }
        if (!form.phoneVerified) {
          toast.error("Verify your phone number before continuing.");
          return false;
        }
        return true;
      }
      if (step === 1) return true;
      if (step === 2) {
        if (!form.packageDraft.priceAmount.trim()) {
          toast.error("Package price is required.");
          return false;
        }
        return true;
      }
      return true;
    },
    [form.displayName, form.packageDraft.priceAmount, form.phoneVerified],
  );

  const handleNext = useCallback(() => {
    if (!validateStep(currentStep)) return;
    if (currentStep < 3) goTo((currentStep + 1) as StepIndex);
  }, [currentStep, goTo, validateStep]);

  const handleBack = useCallback(() => {
    if (currentStep > 0) goTo((currentStep - 1) as StepIndex);
  }, [currentStep, goTo]);

  return (
    <div className="flex h-fit w-full max-w-2xl flex-col bg-white overflow-hidden mx-auto pt-8 pb-12 px-2">
      <div className="shrink-0 px-6 pt-10 pb-2 lg:px-12">
        <div className="mx-auto max-w-2xl">
          <h1 className="text-2xl font-bold text-gray-900">
            Create your creator account
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Fill in your details to get started
          </p>

          <nav aria-label="Form steps" className="mt-8 mb-6">
            <div className="flex items-center justify-between">
              {STEPS.map((step, index) => {
                const isCompleted = index < currentStep;
                const isActive = index === currentStep;
                return (
                  <div
                    key={step.key}
                    className={cn(
                      "flex items-center",
                      index < STEPS.length - 1 ? "flex-1" : "",
                    )}
                  >
                    <div className="relative flex flex-col items-center justify-center">
                      <button
                        type="button"
                        disabled={!isCompleted && !isActive}
                        onClick={() =>
                          isCompleted ? goTo(index as StepIndex) : undefined
                        }
                        className={cn(
                          "relative z-10 flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold transition-all duration-200",
                          isCompleted || isActive
                            ? "bg-purple-600 text-white"
                            : "bg-gray-100 text-gray-900",
                          isCompleted || isActive
                            ? "cursor-pointer"
                            : "cursor-default",
                        )}
                      >
                        {isCompleted ? (
                          <Check className="h-4 w-4" />
                        ) : (
                          index + 1
                        )}
                      </button>
                      <span
                        className={cn(
                          "absolute top-10 text-xs transition-colors whitespace-nowrap",
                          isActive
                            ? "text-purple-600 font-semibold"
                            : "text-gray-700 font-medium",
                        )}
                      >
                        {step.label}
                      </span>
                    </div>
                    {index < STEPS.length - 1 && (
                      <div
                        className={cn(
                          "flex-1 mx-3 border-t-2 transition-colors duration-200",
                          index < currentStep
                            ? "border-purple-600 border-solid"
                            : "border-gray-200 border-dashed",
                        )}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </nav>
        </div>
      </div>

      <div className="flex-1 px-6 pb-8 lg:px-12">
        <div className="mx-auto max-w-2xl">
          <div className="mb-6 border-b border-gray-100 pb-4">
            <h2 className="text-lg font-bold text-gray-900">
              {STEPS[currentStep].label}
            </h2>
            <p className="mt-0.5 text-sm text-gray-400">
              {currentStep === 0 &&
                "Let\u2019s start with your basic information."}
              {currentStep === 1 &&
                "Help brands understand your profile better."}
              {currentStep === 2 && "Set your pricing and available extras."}
              {currentStep === 3 && "Review everything before submitting."}
            </p>
          </div>

          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={currentStep}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
            >
              {currentStep === 0 && <CreatorOnboardingStepBasic form={form} />}
              {currentStep === 1 && (
                <CreatorOnboardingStepProfile form={form} />
              )}
              {currentStep === 2 && (
                <CreatorOnboardingStepPackages form={form} />
              )}
              {currentStep === 3 && (
                <CreatorOnboardingStepReview form={form} onBack={handleBack} />
              )}
            </motion.div>
          </AnimatePresence>

          {currentStep < 3 && (
            <div className="mt-8 border-t border-gray-100 pt-6 pb-8">
              <div className="flex items-center gap-4">
                {currentStep > 0 && (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={handleBack}
                    className="gap-2 text-gray-600"
                  >
                    <ArrowLeft className="h-4 w-4" /> Back
                  </Button>
                )}
                <Button
                  type="button"
                  onClick={handleNext}
                  className="flex-1 gap-2 rounded-xl bg-purple-600 py-3 text-sm font-semibold text-white shadow-lg shadow-purple-200/50 hover:bg-purple-700 transition-all"
                >
                  Continue <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
