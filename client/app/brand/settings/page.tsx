import type { Metadata } from "next";
import { PageHeader } from "@/components/dashboard/page-header";
import { Building2, Bell, CreditCard, Shield } from "lucide-react";

export const metadata: Metadata = { title: "Settings" };

const sections = [
  {
    icon: Building2,
    title: "Brand Profile",
    description: "Update your brand name, logo, website, and description.",
  },
  {
    icon: Bell,
    title: "Notifications",
    description: "Choose how you receive campaign and creator update alerts.",
  },
  {
    icon: CreditCard,
    title: "Billing",
    description: "Manage payment methods, view invoices, and billing history.",
  },
  {
    icon: Shield,
    title: "Security",
    description: "Manage your password, two-factor authentication, and sessions.",
  },
];

export default function BrandSettingsPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Settings"
        description="Manage your brand profile and preferences"
      />

      <div className="space-y-4">
        {sections.map(({ icon: Icon, title, description }) => (
          <div
            key={title}
            className="group flex cursor-pointer items-start gap-4 rounded-2xl border border-border bg-card p-5 transition-shadow hover:shadow-lg hover:shadow-primary/5"
          >
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 transition-colors group-hover:bg-primary/15">
              <Icon className="size-5 text-primary" />
            </div>
            <div>
              <h2 className="text-sm font-medium">{title}</h2>
              <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
