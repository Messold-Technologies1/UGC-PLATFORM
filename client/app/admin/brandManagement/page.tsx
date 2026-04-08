import React from "react";
import { 
  Building2, 
  Rocket, 
  CircleDollarSign,
  MoreHorizontal,
  Filter,
  ArrowUpDown,
  Store,
  Eye,
  Trash2,
  ArrowRight,
  Shapes 
} from "lucide-react";

export default function BrandManagementPage() {
  return (
    <div className="p-8 space-y-8">
      <section className="space-y-4">
        <h1 className="text-4xl font-headline font-bold">Brand Management</h1>
        <p className="text-muted-foreground max-w-2xl font-body">Manage enterprise brand assets, monitor campaign performance, and curate high-performing creator relationships.</p>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { title: "Total Brands", Icon: Building2 },
          { title: "Active Campaigns", Icon: Rocket },
          { title: "Avg. Monthly Spend", Icon: CircleDollarSign }
        ].map((kpi, index) => (
          <div key={index} className="glass-card p-6 rounded-2xl flex flex-col justify-between relative overflow-hidden group text-card-foreground">
            <div className="relative z-10">
              <div className="flex flex-row items-center justify-between mb-4">
                <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                  <kpi.Icon className="w-6 h-6 text-primary" />
                </div>
                <span className="text-muted-foreground/30 text-xs font-bold bg-muted/20 px-2.5 py-1 rounded-full flex items-center">
                  <MoreHorizontal className="w-4 h-4" />
                </span>
              </div>
              <p className="text-muted-foreground text-sm font-medium">{kpi.title}</p>
              <h3 className="text-3xl font-headline font-bold mt-1 text-muted-foreground/30">
                <MoreHorizontal className="w-8 h-8" />
              </h3>
            </div>
          </div>
        ))}
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-headline font-semibold">Manage Brands</h3>
          <div className="flex gap-2">
            <button className="p-2 hover:bg-muted rounded-lg text-muted-foreground transition-colors">
              <Filter className="w-5 h-5" />
            </button>
            <button className="p-2 hover:bg-muted rounded-lg text-muted-foreground transition-colors">
              <ArrowUpDown className="w-5 h-5" />
            </button>
          </div>
        </div>
        
        <div className="w-full overflow-x-auto rounded-2xl glass-card text-card-foreground">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Brand Entity</th>
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Niche</th>
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Campaigns</th>
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total Spend</th>
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Status</th>
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {[1, 2, 3].map((row) => (
                <tr key={row} className="group hover:bg-muted/50 transition-colors">
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                        <Store className="w-5 h-5 text-muted-foreground/50" />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <MoreHorizontal className="w-5 h-5 text-muted-foreground/30" />
                        <MoreHorizontal className="w-4 h-4 text-muted-foreground/20" />
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <MoreHorizontal className="w-5 h-5 text-muted-foreground/30" />
                  </td>
                  <td className="px-6 py-5">
                    <MoreHorizontal className="w-5 h-5 text-muted-foreground/30" />
                  </td>
                  <td className="px-6 py-5">
                    <MoreHorizontal className="w-5 h-5 text-muted-foreground/30" />
                  </td>
                  <td className="px-6 py-5">
                    <MoreHorizontal className="w-5 h-5 text-muted-foreground/30" />
                  </td>
                  <td className="px-6 py-5 text-right">
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button className="p-2 hover:bg-muted rounded-md text-foreground transition-colors">
                        <Eye className="w-4 h-4" />
                      </button>
                      <button className="p-2 hover:bg-destructive/10 rounded-md text-destructive transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-card p-6 rounded-2xl space-y-6 text-card-foreground">
          <h4 className="text-lg font-semibold">Recent System Activity</h4>
          <div className="space-y-4">
            {[1, 2, 3].map((act) => (
              <div key={act} className="flex flex-row gap-4 items-start">
                <div className="w-1.5 h-10 bg-muted rounded-full shrink-0"></div>
                <div className="flex flex-col gap-1.5 pt-1">
                  <MoreHorizontal className="w-5 h-5 text-muted-foreground/30" />
                  <MoreHorizontal className="w-4 h-4 text-muted-foreground/20" />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="glass-card p-8 rounded-2xl relative overflow-hidden flex flex-col justify-center min-h-[220px]">
          <div className="relative z-10 space-y-3">
            <span className="px-2.5 py-1 bg-primary/10 text-primary rounded-md text-[11px] font-semibold uppercase inline-flex items-center gap-1">
               System Feature
            </span>
            <h4 className="text-2xl font-headline font-bold leading-tight">Empower Your Network</h4>
            <p className="text-sm text-muted-foreground max-w-[280px]">Automate your vetting process with our new AI-driven Creator Match engine.</p>
            <button className="mt-2 flex items-center gap-1.5 text-primary outline-none font-medium text-sm group hover:underline underline-offset-4">
              Explore Insights <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
          <div className="absolute right-0 bottom-0 top-0 w-1/3 flex items-center justify-center opacity-5 pointer-events-none">
            <Shapes className="w-48 h-48 -rotate-12" />
          </div>
        </div>
      </section>
    </div>
  );
}
