import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/dashboard/page-header";
import { UserCircle, Bell, CreditCard } from "lucide-react";

export const metadata: Metadata = { title: "Settings" };

const PROFILE_SETTINGS_HREF = "/creator/settings/profile" as const;

const sections = [
  {
    icon: UserCircle,
    title: "Profile",
    description:
      "Update your display name, bio, profile picture, and social links.",
    href: PROFILE_SETTINGS_HREF,
  },
  {
    icon: Bell,
    title: "Notifications",
    description: "Choose how you receive campaign invites and payment alerts.",
  },
  {
    icon: CreditCard,
    title: "Payout",
    description: "Configure your payout method and view payment history.",
  },
];

export default function CreatorSettingsPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Settings"
        description="Manage your creator profile and preferences"
      />

      <div className="space-y-4">
        {sections.map(({ icon: Icon, title, description, href }) => {
          const className =
            "group flex cursor-pointer items-start gap-4 rounded-2xl border border-border bg-card p-5 transition-shadow hover:shadow-lg hover:shadow-primary/5";
          const inner = (
            <>
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 transition-colors group-hover:bg-primary/15">
                <Icon className="size-5 text-primary" />
              </div>
              <div>
                <h2 className="text-sm font-medium">{title}</h2>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {description}
                </p>
              </div>
            </>
          );

          if (href) {
            return (
              <Link key={title} href={href} className={className}>
                {inner}
              </Link>
            );
          }

          return (
            <div key={title} className={className}>
              {inner}
            </div>
          );
        })}
      </div>
    </div>
  );
}
