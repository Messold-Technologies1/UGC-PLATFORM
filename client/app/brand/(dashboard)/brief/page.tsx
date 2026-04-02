import type { Metadata } from "next";
import { BrandCampaignBriefForm } from "@/features/brand-brief/components/brand-campaign-brief-form";

export const metadata: Metadata = { title: "Campaign brief" };

export default function BrandBriefPage() {
  return <BrandCampaignBriefForm />;
}
