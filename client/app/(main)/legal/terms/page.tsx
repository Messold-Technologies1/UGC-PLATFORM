import type { Metadata } from "next";
import { DynamicLegalPage } from "@/components/legal/dynamic-legal-page";

export const metadata: Metadata = {
  title: "Terms of Service",
  description:
    "Read the Terms of Service for GoCollab — the UGC marketplace connecting brands and creators. Understand your rights and responsibilities.",
};

export default function TermsOfServicePage() {
  return (
    <DynamicLegalPage
      slug="terms-of-service"
      fallbackTitle="Terms of Service"
      fallbackDescription="These Terms of Service govern your access to and use of the GoCollab platform. Please read them carefully before using our services."
    />
  );
}
