import { cn } from "@/lib/utils"

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn(
        "rounded-md animate-pulse bg-[var(--skeleton-color)] dark:bg-[var(--skeleton-dark-color)]",
        className,
      )}
      {...props}
    />
  )
}

export { Skeleton }
