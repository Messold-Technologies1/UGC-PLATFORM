import type { Metadata } from "next";
import { PageHeader } from "@/components/dashboard/page-header";
import { PublicPageTemplatePicker } from "@/features/creators/components/public-page-settings/public-page-template-picker";

export const metadata: Metadata = { title: "Public page" };

export default function CreatorPublicPageSettingsPage() {
  return (
    <div className="space-y-8 pt-4 lg:pt-5">
      <PageHeader
        title="Public page"
        description="Choose how your public profile looks to brands. You can change the design at any time — it goes live immediately."
      />
      <PublicPageTemplatePicker />
    </div>
  );
}
