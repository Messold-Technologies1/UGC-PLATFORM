import * as React from "react"
import { cn } from "@/lib/utils"

function Pagination({ className, ...props }: React.ComponentProps<"nav">) {
  return (
    <nav
      role="navigation"
      aria-label="pagination"
      data-slot="pagination"
      className={cn("mx-auto flex w-full justify-center", className)}
      {...props}
    />
  )
}

function PaginationContent({
  className,
  ...props
}: React.ComponentProps<"ul">) {
  return (
    <ul
      data-slot="pagination-content"
      className={cn("flex items-center gap-1 px-1", className)}
      {...props}
    />
  )
}

function PaginationItem({ ...props }: React.ComponentProps<"li">) {
  return <li data-slot="pagination-item" {...props} />
}

type PaginationLinkProps = {
  isActive?: boolean
} & React.ComponentProps<"a">

function PaginationLink({
  className,
  isActive,
  ...props
}: PaginationLinkProps) {
  return (
    <a
      aria-current={isActive ? "page" : undefined}
      data-slot="pagination-link"
      data-active={isActive}
      className={cn(
        "flex w-10 h-10 items-center justify-center rounded-lg transition-all",
        isActive 
          ? "bg-primary text-primary-foreground font-bold shadow-md shadow-primary/20 hover:brightness-110"
          : "text-muted-foreground hover:text-foreground hover:bg-accent/30 font-medium",
        className
      )}
      {...props}
    />
  )
}

function PaginationPrevious({
  className,
  ...props
}: React.ComponentProps<"button">) {
  return (
    <button
      aria-label="Go to previous page"
      className={cn(
        "p-2 mr-2 flex rounded-lg border border-border/50 text-muted-foreground hover:text-foreground hover:bg-accent/30 transition-all disabled:opacity-30 disabled:cursor-not-allowed",
        className
      )}
      {...props}
    >
      <span className="material-symbols-outlined text-lg">chevron_left</span>
    </button>
  )
}

function PaginationNext({
  className,
  ...props
}: React.ComponentProps<"button">) {
  return (
    <button
      aria-label="Go to next page"
      className={cn(
        "p-2 ml-2 flex rounded-lg border border-border/50 text-muted-foreground hover:text-foreground hover:bg-accent/30 transition-all disabled:opacity-30 disabled:cursor-not-allowed",
        className
      )}
      {...props}
    >
      <span className="material-symbols-outlined text-lg">chevron_right</span>
    </button>
  )
}

function PaginationEllipsis({
  className,
  ...props
}: React.ComponentProps<"span">) {
  return (
    <span
      aria-hidden
      data-slot="pagination-ellipsis"
      className={cn(
        "flex w-10 h-10 items-center justify-center text-muted-foreground font-medium tracking-widest",
        className
      )}
      {...props}
    >
      ...
      <span className="sr-only">More pages</span>
    </span>
  )
}

export {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
}
