import { cn } from "@/lib/utils";

interface BrandAvatarProps {
  initials: string;
  bgClass: string;
  size?: "xs" | "sm" | "md" | "lg";
  className?: string;
}

const SIZE_CLASSES = {
  xs: "size-6 text-[10px] rounded-md",
  sm: "size-8 text-xs rounded-lg",
  md: "size-9 text-xs rounded-lg",
  lg: "size-10 text-sm rounded-xl",
};

export function BrandAvatar({
  initials,
  bgClass,
  size = "md",
  className,
}: BrandAvatarProps) {
  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center font-bold text-white",
        SIZE_CLASSES[size],
        bgClass,
        className
      )}
    >
      {initials}
    </div>
  );
}
