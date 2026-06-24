import type { Metadata } from "next";
import { DynamicLegalPage } from "@/components/legal/dynamic-legal-page";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "Read GoCollab's Privacy Policy to learn how we collect, use, store, share, and protect your personal information on our UGC marketplace platform.",
};

export default function PrivacyPolicyPage() {
  return (
    <DynamicLegalPage
      slug="privacy-policy"
      fallbackTitle="Privacy Policy"
      fallbackDescription="This Privacy Policy explains how GoCollab collects, uses, stores, shares, and protects personal information when you access or use our platform and related services."
    />
  );
}
