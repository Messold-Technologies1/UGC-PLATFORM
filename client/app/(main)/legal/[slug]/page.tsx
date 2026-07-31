import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DynamicLegalPage } from "@/components/legal/dynamic-legal-page";
import { ENDPOINTS } from "@/lib/endpoints";
import { env } from "@/lib/env";

interface PageProps {
  params: Promise<{ slug: string }>;
}

interface LegalPageMeta {
  title: string;
  description: string;
}

/**
 * Public route for any admin-created/published legal page, reachable at
 * /legal/<slug>. The three original pages keep their friendly aliases
 * (/legal/terms, /legal/privacy, /legal/guidelines) via their own static
 * routes, which take precedence over this dynamic one.
 */
async function fetchLegalPage(slug: string): Promise<LegalPageMeta | null> {
  try {
    const res = await fetch(
      `${env.apiUrl}${ENDPOINTS.LEGAL_PAGES.BY_SLUG(slug)}`,
      { cache: "no-store" },
    );
    if (!res.ok) return null;
    const data = (await res.json()) as Partial<LegalPageMeta>;
    return {
      title: typeof data.title === "string" ? data.title : "",
      description: typeof data.description === "string" ? data.description : "",
    };
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const page = await fetchLegalPage(slug);
  if (!page) return { title: "Legal" };
  return {
    title: page.title || "Legal",
    description: page.description || undefined,
  };
}

export default async function LegalPageBySlug({ params }: PageProps) {
  const { slug } = await params;
  const page = await fetchLegalPage(slug);
  if (!page) notFound();

  return (
    <DynamicLegalPage
      slug={slug}
      fallbackTitle={page.title || "Legal"}
      fallbackDescription={page.description}
    />
  );
}
