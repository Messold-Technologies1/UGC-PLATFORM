import type { Metadata } from "next";
import { Clock3, Package, ShoppingCart, Wallet } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { StatCard } from "@/components/dashboard/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Orders",
};

const stats = [
  { label: "Active Orders", value: "0", icon: ShoppingCart },
  { label: "Pending Delivery", value: "0", icon: Clock3 },
  { label: "Completed", value: "0", icon: Package },
  { label: "Total Earnings", value: "$0.00", icon: Wallet },
];

export default function CreatorOrdersPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Orders"
        description="Track your creator collaborations, delivery status, and payouts."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <StatCard key={stat.label} {...stat} />
        ))}
      </div>

      <Card className="border-border">
        <CardHeader>
          <CardTitle>Order activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex min-h-72 flex-col items-center justify-center rounded-2xl border border-dashed border-border/70 bg-muted/20 px-6 py-10 text-center">
            <div className="mb-4 flex size-12 items-center justify-center rounded-2xl bg-primary/10">
              <ShoppingCart className="size-5 text-primary" />
            </div>
            <p className="text-sm font-medium">No orders yet</p>
            <p className="mt-2 max-w-md text-sm text-muted-foreground">
              When brands place orders with you, they&apos;ll appear here so you
              can follow progress and manage delivery.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
