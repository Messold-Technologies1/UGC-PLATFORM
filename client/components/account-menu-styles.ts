import { cn } from "@/lib/utils";


export const accountMenuGlassPanel =
  "border border-border/60 bg-background/50 shadow-lg backdrop-blur-md backdrop-saturate-125";

export const accountMenuItemClass = cn(
  "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium outline-none",
  "text-foreground/90 transition-[background-color,color,transform] duration-150 ease-out",
  "hover:bg-background/70 hover:text-foreground dark:hover:bg-background/45",
  "active:scale-[0.99]",
  "[&_svg]:shrink-0 [&_svg]:text-muted-foreground [&_svg]:transition-colors [&_svg]:duration-150",
  "hover:[&_svg]:text-primary",
  "focus-visible:bg-background/70 focus-visible:ring-2 focus-visible:ring-ring/40 dark:focus-visible:bg-background/45",
);

export const accountMenuItemLogoutClass = cn(
  accountMenuItemClass,
  "hover:text-destructive hover:[&_svg]:text-destructive dark:hover:bg-destructive/12",
);
