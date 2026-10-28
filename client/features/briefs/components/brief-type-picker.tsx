"use client";

import Image from "next/image";
import { Check } from "lucide-react";
import { BRIEF_TYPE_COPY } from "@/features/briefs/lib/brief-offer-labels";
import { cn } from "@/lib/utils";

type BriefType = "product" | "service";

type BriefTypePickerProps = {
  value: BriefType;
  onChange: (nextIsProduct: boolean) => void;
};

export function BriefTypePicker({ value, onChange }: BriefTypePickerProps) {
  const selected = BRIEF_TYPE_COPY[value];

  return (
    <div className="mb-[22px]">
      <p className="mb-3.5 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
        What would you like the creator to promote?
      </p>

      <div
        className="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-2"
        role="radiogroup"
      >
        <button
          type="button"
          role="radio"
          aria-checked={value === "product"}
          className={cn(
            "relative flex w-full cursor-pointer items-center gap-3.5 rounded-2xl border-[1.5px] border-zinc-200 bg-white py-[18px] pl-4 pr-11 text-left transition-[background,border-color] duration-150 hover:border-zinc-300 dark:border-zinc-700 dark:bg-card dark:hover:border-zinc-600",
            value === "product" &&
              "border-rose-300 bg-rose-50 hover:border-rose-300 dark:border-rose-400/50 dark:bg-rose-500/10",
          )}
          onClick={() => onChange(true)}
        >
          {value === "product" ? (
            <span
              className="absolute top-3 right-3 flex size-[22px] items-center justify-center rounded-full bg-rose-400 text-white"
              aria-hidden="true"
            >
              <Check className="size-3.5" strokeWidth={3} />
            </span>
          ) : null}
          <Image
            src="/assets/brief-type-product.png"
            alt=""
            width={88}
            height={88}
            className="size-[72px] shrink-0 object-contain mix-blend-multiply dark:mix-blend-normal"
          />
          <span className="flex min-w-0 flex-col gap-1 pt-0">
            <span className="text-[15px] font-extrabold leading-tight text-zinc-900 dark:text-zinc-50">
              {BRIEF_TYPE_COPY.product.tab}
            </span>
            <span className="text-xs leading-snug text-zinc-500 dark:text-zinc-400">
              {BRIEF_TYPE_COPY.product.cardBlurb}
            </span>
          </span>
        </button>

        <button
          type="button"
          role="radio"
          aria-checked={value === "service"}
          className={cn(
            "relative flex w-full cursor-pointer items-center gap-3.5 rounded-2xl border-[1.5px] border-zinc-200 bg-white py-[18px] pl-4 pr-11 text-left transition-[background,border-color] duration-150 hover:border-zinc-300 dark:border-zinc-700 dark:bg-card dark:hover:border-zinc-600",
            value === "service" &&
              "border-rose-300 bg-rose-50 hover:border-rose-300 dark:border-rose-400/50 dark:bg-rose-500/10",
          )}
          onClick={() => onChange(false)}
        >
          {value === "service" ? (
            <span
              className="absolute top-3 right-3 flex size-[22px] items-center justify-center rounded-full bg-rose-400 text-white"
              aria-hidden="true"
            >
              <Check className="size-3.5" strokeWidth={3} />
            </span>
          ) : null}
          <Image
            src="/assets/brief-type-service.png"
            alt=""
            width={88}
            height={88}
            className="size-[72px] shrink-0 object-contain mix-blend-multiply dark:mix-blend-normal"
          />
          <span className="flex min-w-0 flex-col gap-1 pt-0">
            <span className="text-[15px] font-extrabold leading-tight text-zinc-900 dark:text-zinc-50">
              {BRIEF_TYPE_COPY.service.tab}
            </span>
            <span className="text-xs leading-snug text-zinc-500 dark:text-zinc-400">
              {BRIEF_TYPE_COPY.service.cardBlurb}
            </span>
          </span>
        </button>
      </div>

      <div className="rounded-[14px] bg-rose-50 px-[18px] py-4 dark:bg-rose-500/10">
        <p className="mb-1 text-[13px] font-extrabold text-zinc-900 dark:text-zinc-50">
          {selected.title}
        </p>
        <p className="m-0 text-[13px] leading-relaxed text-zinc-600 dark:text-zinc-300">
          {selected.description}
        </p>
      </div>
    </div>
  );
}
