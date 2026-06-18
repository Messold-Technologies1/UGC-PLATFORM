"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { useOnborda, type CardComponentProps } from "onborda";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const VIEWPORT_MARGIN = 16;
const CARD_GAP = 25;
const ARROW_SIZE = 24;

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(value, max));
}

interface CardPlacement {
  left: number;
  top: number;
  arrowOffset: number;
  arrowSide: "top" | "bottom" | "left" | "right";
}

function computePlacement(
  anchorRect: DOMRect,
  targetCenterX: number,
  targetCenterY: number,
  side: string,
  cardWidth: number,
  cardHeight: number,
): CardPlacement {
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  let left = 0;
  let top = 0;
  let arrowSide: CardPlacement["arrowSide"] = "top";

  switch (side) {
    case "top":
      left = anchorRect.left + anchorRect.width / 2 - cardWidth / 2;
      top = anchorRect.top - cardHeight - CARD_GAP;
      arrowSide = "bottom";
      break;
    case "left":
    case "left-top":
      left = anchorRect.left - cardWidth - CARD_GAP;
      top = anchorRect.top;
      arrowSide = "right";
      break;
    case "left-bottom":
      left = anchorRect.left - cardWidth - CARD_GAP;
      top = anchorRect.bottom - cardHeight;
      arrowSide = "right";
      break;
    case "right":
    case "right-top":
      left = anchorRect.right + CARD_GAP;
      top = anchorRect.top;
      arrowSide = "left";
      break;
    case "right-bottom":
      left = anchorRect.right + CARD_GAP;
      top = anchorRect.bottom - cardHeight;
      arrowSide = "left";
      break;
    case "bottom-left":
      left = anchorRect.left;
      top = anchorRect.bottom + CARD_GAP;
      arrowSide = "top";
      break;
    case "bottom-right":
      left = anchorRect.right - cardWidth;
      top = anchorRect.bottom + CARD_GAP;
      arrowSide = "top";
      break;
    case "bottom":
    default:
      left = anchorRect.left + anchorRect.width / 2 - cardWidth / 2;
      top = anchorRect.bottom + CARD_GAP;
      arrowSide = "top";
      break;
  }

  if (side === "left" || side === "right") {
    top = anchorRect.top + anchorRect.height / 2 - cardHeight / 2;
  }

  left = clamp(left, VIEWPORT_MARGIN, vw - cardWidth - VIEWPORT_MARGIN);
  top = clamp(top, VIEWPORT_MARGIN, vh - cardHeight - VIEWPORT_MARGIN);

  let arrowOffset = 0;

  if (arrowSide === "top" || arrowSide === "bottom") {
    arrowOffset = clamp(targetCenterX - left, ARROW_SIZE, cardWidth - ARROW_SIZE);
  } else {
    arrowOffset = clamp(targetCenterY - top, ARROW_SIZE, cardHeight - ARROW_SIZE);
  }

  return { left, top, arrowOffset, arrowSide };
}

function arrowRotation(side: CardPlacement["arrowSide"]) {
  if (side === "top") return 270;
  if (side === "bottom") return 90;
  if (side === "left") return 180;
  return 0;
}

function applyArrowStyles(
  arrow: SVGSVGElement,
  placement: CardPlacement,
) {
  const { arrowSide, arrowOffset } = placement;
  const rotation = arrowRotation(arrowSide);

  arrow.style.left = "";
  arrow.style.right = "";
  arrow.style.top = "";
  arrow.style.bottom = "";

  if (arrowSide === "top") {
    arrow.style.left = `${arrowOffset}px`;
    arrow.style.top = `${-ARROW_SIZE + 1}px`;
    arrow.style.transform = `translate(-50%, 0) rotate(${rotation}deg)`;
  } else if (arrowSide === "bottom") {
    arrow.style.left = `${arrowOffset}px`;
    arrow.style.bottom = `${-ARROW_SIZE + 1}px`;
    arrow.style.transform = `translate(-50%, 0) rotate(${rotation}deg)`;
  } else if (arrowSide === "left") {
    arrow.style.top = `${arrowOffset}px`;
    arrow.style.left = `${-ARROW_SIZE + 1}px`;
    arrow.style.transform = `translate(0, -50%) rotate(${rotation}deg)`;
  } else {
    arrow.style.top = `${arrowOffset}px`;
    arrow.style.right = `${-ARROW_SIZE + 1}px`;
    arrow.style.transform = `translate(0, -50%) rotate(${rotation}deg)`;
  }
}

/**
 * Branded card rendered by Onborda for every tour step. Styling intentionally
 * mirrors the dashboard design system (card surface, primary accent, heading
 * font) so the tour feels native rather than bolted on.
 */
export function TourCard({
  step,
  currentStep,
  totalSteps,
  nextStep,
  prevStep,
}: CardComponentProps) {
  const { closeOnborda } = useOnborda();
  const cardRef = useRef<HTMLDivElement>(null);
  const arrowRef = useRef<SVGSVGElement>(null);
  const [mounted, setMounted] = useState(false);

  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === totalSteps - 1;

  useLayoutEffect(() => {
    setMounted(true);
  }, []);

  useLayoutEffect(() => {
    if (!step) return;

    const wrapper = cardRef.current?.closest(
      '[data-name="onborda-card"]',
    ) as HTMLElement | null;

    if (wrapper) {
      wrapper.style.visibility = "hidden";
      wrapper.style.pointerEvents = "none";
    }

    let rafId = 0;

    const tick = () => {
      const pointer = document.querySelector('[data-name="onborda-pointer"]');
      const target = document.querySelector(step.selector);
      const card = cardRef.current;
      if (!pointer || !target || !card) {
        rafId = requestAnimationFrame(tick);
        return;
      }

      const pointerRect = pointer.getBoundingClientRect();
      const targetRect = target.getBoundingClientRect();
      const cardWidth = card.offsetWidth || 320;
      const cardHeight = card.offsetHeight || 200;
      const nextPlacement = computePlacement(
        pointerRect,
        targetRect.left + targetRect.width / 2,
        targetRect.top + targetRect.height / 2,
        step.side ?? "bottom",
        cardWidth,
        cardHeight,
      );

      card.style.visibility = "visible";
      card.style.left = `${nextPlacement.left}px`;
      card.style.top = `${nextPlacement.top}px`;

      if (arrowRef.current) {
        applyArrowStyles(arrowRef.current, nextPlacement);
      }

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(rafId);
      if (wrapper) {
        wrapper.style.visibility = "";
        wrapper.style.pointerEvents = "";
      }
    };
  }, [currentStep, step]);

  if (!step) {
    return null;
  }

  const card = (
    <div
      ref={cardRef}
      style={{
        position: "fixed",
        visibility: "hidden",
        zIndex: 1010,
      }}
      className="relative w-[320px] max-w-[min(320px,calc(100vw-2rem))] rounded-2xl border border-border/60 bg-card text-card-foreground shadow-2xl shadow-black/10"
    >
      <svg
        ref={arrowRef}
        viewBox="0 0 54 54"
        aria-hidden
        className="pointer-events-none absolute size-6 origin-center text-card"
      >
        <path d="M27 27L0 0V54L27 27Z" fill="currentColor" />
      </svg>

      <div className="flex items-start justify-between gap-3 px-5 pt-5">
        <div className="flex items-center gap-2">
          {step.icon ? (
            <span aria-hidden className="text-lg leading-none">
              {step.icon}
            </span>
          ) : null}
          <h3 className="font-heading text-base font-bold leading-tight">
            {step.title}
          </h3>
        </div>
        <button
          type="button"
          onClick={() => closeOnborda()}
          aria-label="Skip tour"
          className="-mr-1 -mt-1 rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <X className="size-4" />
        </button>
      </div>

      <div className="px-5 pt-2 text-sm leading-relaxed text-muted-foreground">
        {step.content}
      </div>

      <div className="flex items-center justify-between gap-3 px-5 pb-5 pt-4">
        <div className="flex items-center gap-1.5" aria-hidden>
          {Array.from({ length: totalSteps }).map((_, index) => (
            <span
              key={index}
              className={cn(
                "h-1.5 rounded-full transition-all",
                index === currentStep
                  ? "w-4 bg-primary"
                  : "w-1.5 bg-muted-foreground/30",
              )}
            />
          ))}
        </div>
        <div className="flex items-center gap-2">
          {!isFirstStep && (
            <Button variant="ghost" size="sm" onClick={() => prevStep()}>
              Back
            </Button>
          )}
          {isLastStep ? (
            <Button size="sm" onClick={() => closeOnborda()}>
              Done
            </Button>
          ) : (
            <Button size="sm" onClick={() => nextStep()}>
              Next
            </Button>
          )}
        </div>
      </div>
    </div>
  );

  if (!mounted) {
    return <div className="hidden" aria-hidden />;
  }

  return createPortal(card, document.body);
}
