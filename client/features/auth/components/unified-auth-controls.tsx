import type { ReactNode } from "react";

/** Shared control styling for the unified auth screens (Aurora direction). */

export const authLabelClass =
  "block text-[12px] font-semibold text-[#4a4247] mb-1";

export const authFieldClass =
  "h-[42px] w-full rounded-[11px] border-[1.5px] border-[#e7e1e4] bg-white px-3.5 text-[14px] text-[#181313] outline-none transition-colors placeholder:text-[#B0AAAE] focus:border-deep-pink focus:ring-4 focus:ring-deep-pink/10 disabled:opacity-70";

export const authCtaClass =
  "flex h-[46px] w-full items-center justify-center gap-2 rounded-[11px] border-0 bg-gradient-to-r from-[#6e2545] to-[#B3123F] text-[14.5px] font-bold text-white shadow-[0_12px_28px_-10px_rgba(110,37,69,0.5)] transition hover:-translate-y-px hover:shadow-[0_16px_38px_-10px_rgba(110,37,69,0.55)] disabled:cursor-default disabled:opacity-70 disabled:hover:translate-y-0";

export const authSecondaryClass =
  "flex h-[42px] w-full items-center justify-center gap-2.5 rounded-[11px] border-[1.5px] border-[#e7e1e4] bg-white text-[14px] font-semibold text-[#181313] transition-colors hover:bg-[#faf4f6] disabled:cursor-default disabled:opacity-70";

export function AuthDivider({ children }: { children: ReactNode }) {
  return (
    <div className="my-4 flex items-center gap-3.5">
      <span className="h-px flex-1 bg-[#eee7ea]" />
      <span className="text-xs font-semibold text-[#a89ea3]">{children}</span>
      <span className="h-px flex-1 bg-[#eee7ea]" />
    </div>
  );
}
