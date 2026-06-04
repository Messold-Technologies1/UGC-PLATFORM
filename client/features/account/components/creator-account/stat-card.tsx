import * as React from "react";
import { type ReactNode } from "react";
import { ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export type StatItem = {
  label: string;
  value: string;
  linkText: string;
  icon: ReactNode;
  iconBg: string;
  iconColor: string;
};

export function StatCard({ stat }: { stat: StatItem }) {
  return (
    <motion.div
      whileHover={{ y: -2, transition: { duration: 0.2 } }}
      className="group flex items-start gap-4 p-6 transition-colors bg-card"
    >
      <div
        className={cn(
          "flex size-12 shrink-0 items-center justify-center rounded-2xl",
          stat.iconBg,
          stat.iconColor,
        )}
        aria-hidden="true"
      >
        {stat.icon}
      </div>
      <div className="flex flex-col">
        <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
        <p className="mt-0.5 text-2xl font-bold tracking-tight text-foreground">{stat.value}</p>
        <button
          className="mt-3 flex items-center gap-1 text-[13px] font-semibold text-primary transition-colors hover:underline"
          aria-label={`${stat.linkText} for ${stat.label}`}
        >
          {stat.linkText}
          <ArrowRight className="size-3.5" />
        </button>
      </div>
    </motion.div>
  );
}
