import { memo } from "react";
import { type LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";

interface StatCardProps {
  label: string;
  value: string;
  icon: LucideIcon;
  trend?: string;
}

export const StatCard = memo(function StatCard({ label, value, icon: Icon, trend }: StatCardProps) {
  return (
    <Card interactive="subtle" className="group relative overflow-hidden p-5">
      <div className="absolute -right-4 -top-4 size-20 rounded-full bg-primary/5 transition-transform group-hover:scale-110" />
      <div className="relative">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10">
            <Icon className="size-4 text-primary" />
          </div>
        </div>
        <p className="mt-3 text-2xl font-bold tracking-tight">{value}</p>
        {trend && (
          <p className="mt-1 text-xs font-medium text-emerald-600">{trend}</p>
        )}
      </div>
    </Card>
  );
});
