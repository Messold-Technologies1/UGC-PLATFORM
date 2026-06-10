import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { type ReactNode } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "lime" | "ghost";

const styles: Record<Variant, string> = {
  primary:
    "bg-foreground text-background hover:bg-foreground/90 active:scale-[.98]",
  secondary:
    "bg-background text-foreground border-2 border-foreground hover:bg-foreground hover:text-background",
  lime:
    "bg-lime text-lime-foreground border-2 border-foreground shadow-hard hover:-translate-y-0.5 hover:translate-x-0.5 hover:shadow-none",
  ghost: "bg-transparent text-foreground hover:bg-foreground/5",
};

export function PillButton({
  variant = "primary",
  children,
  className,
  arrow = false,
  href,
  onClick,
}: {
  variant?: Variant;
  children: ReactNode;
  className?: string;
  arrow?: boolean;
  /** When set, renders a Next.js link (recommended for landing CTAs). */
  href?: string;
  onClick?: () => void;
}) {
  const cls = cn(
    "inline-flex cursor-pointer items-center justify-center gap-2 rounded-full px-6 py-3 text-center text-sm font-semibold whitespace-nowrap transition-all duration-200",
    styles[variant],
    className,
  );
  const inner = (
    <>
      {children}
      {arrow ? <ArrowRight className="h-4 w-4 shrink-0" /> : null}
    </>
  );

  if (href) {
    return (
      <Link href={href} className={cls} onClick={onClick}>
        {inner}
      </Link>
    );
  }

  return (
    <button type="button" className={cls} onClick={onClick}>
      {inner}
    </button>
  );
}
