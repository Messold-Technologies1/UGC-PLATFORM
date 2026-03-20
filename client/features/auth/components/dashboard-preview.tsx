import { BarChart3, Users, Video, TrendingUp } from "lucide-react";

const previewStats = [
  { label: "Campaigns", value: "12", icon: BarChart3 },
  { label: "Creators", value: "48", icon: Users },
  { label: "Videos", value: "156", icon: Video },
  { label: "Growth", value: "+24%", icon: TrendingUp },
];

export function DashboardPreview() {
  return (
    <div className="relative hidden h-full w-full items-center justify-center overflow-hidden bg-muted lg:flex">
      <div className="w-full max-w-md space-y-4 p-10">
        <div className="rounded-2xl border border-border bg-card p-6 shadow-xl">
          <p className="text-sm font-medium text-muted-foreground">
            Dashboard Preview
          </p>
          <div className="mt-4 grid grid-cols-2 gap-3">
            {previewStats.map(({ label, value, icon: Icon }) => (
              <div
                key={label}
                className="rounded-xl bg-muted/50 p-3 text-center"
              >
                <Icon className="mx-auto size-4 text-muted-foreground" />
                <p className="mt-1 text-lg font-bold">{value}</p>
                <p className="text-xs text-muted-foreground">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}