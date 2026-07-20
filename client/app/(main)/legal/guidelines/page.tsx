import type { Metadata } from "next";
import { DynamicLegalPage } from "@/components/legal/dynamic-legal-page";

export const metadata: Metadata = {
  title: "Creator Quality Guidelines",
  description:
    "Read GoCollab's Creator Quality Guidelines — the standards every creator agrees to follow for video quality, lighting, audio, editing, format, and professionalism.",
};

export default function CreatorQualityGuidelinesPage() {
  return (
    <DynamicLegalPage
      slug="creator-quality-guidelines"
      fallbackTitle="Creator Quality Guidelines"
      fallbackDescription="These Creator Quality Guidelines set the standards every creator agrees to follow when producing and delivering content on GoCollab. Please read them carefully before creating your profile or uploading content."
    />
  );
}
