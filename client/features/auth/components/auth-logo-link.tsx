import Link from "next/link";
import { cn } from "@/lib/utils";

type AuthLogoLinkProps = {
  className?: string;
  imageClassName?: string;
};

export function AuthLogoLink({ className, imageClassName }: AuthLogoLinkProps) {
  return (
    <Link
      href="/"
      className={cn("inline-block", className)}
      aria-label="Go to GoCollab home"
    >
      <img
        src="/brand-logo.png"
        alt="GoCollab"
        className={cn(
          "w-auto object-contain object-left",
          imageClassName,
        )}
        draggable={false}
      />
    </Link>
  );
}
