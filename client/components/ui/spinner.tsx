import { Loader2Icon } from "lucide-react"

import { cn } from "@/lib/utils"

function Spinner({
  className,
  role,
  "aria-label": ariaLabel,
  ...props
}: React.ComponentProps<"svg">) {
  const decorative = props["aria-hidden"] === true

  return (
    <Loader2Icon
      role={decorative ? undefined : role ?? "status"}
      aria-label={decorative ? undefined : ariaLabel ?? "Loading"}
      className={cn("size-4 animate-spin", className)}
      {...props}
    />
  )
}

export { Spinner }
