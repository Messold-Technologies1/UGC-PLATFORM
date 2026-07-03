"use client";

import { useEffect, useState } from "react";
import { LegalPageHeader } from "@/components/legal/legal-page-header";
import {
  TableOfContents,
  type TocItem,
} from "@/components/legal/table-of-contents";
import { LegalSectionRenderer } from "@/components/legal/legal-section-renderer";
import type { LegalPageResponse } from "@/features/admin/types/legal-pages";
import { ENDPOINTS } from "@/lib/endpoints";
import { env } from "@/lib/env";

interface DynamicLegalPageProps {
  slug: string;
  fallbackTitle: string;
  fallbackDescription: string;
}

export function DynamicLegalPage({
  slug,
  fallbackTitle,
  fallbackDescription,
}: DynamicLegalPageProps) {
  const [page, setPage] = useState<LegalPageResponse | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    async function fetchPage() {
      try {
        const res = await fetch(
          `${env.apiUrl}${ENDPOINTS.LEGAL_PAGES.BY_SLUG(slug)}`,
          { cache: "no-store" },
        );
        if (!res.ok) {
          setError(true);
          return;
        }
        const data: LegalPageResponse = await res.json();
        setPage(data);
      } catch {
        setError(true);
      }
    }
    fetchPage();
  }, [slug]);

  if (!page && !error) {
    return (
      <>
        <header className="mb-10">
          <h1 className="text-center text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
            {fallbackTitle}
          </h1>
          <hr className="mt-8 border-border" />
          <div className="mt-6 space-y-4 text-sm leading-relaxed text-muted-foreground">
            <p className="max-w-3xl">{fallbackDescription}</p>
          </div>
        </header>
        <div className="grid gap-10 lg:grid-cols-[1fr_260px]">
          <article className="min-w-0 space-y-8">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="space-y-3 animate-pulse">
                <div className="h-7 w-2/5 rounded bg-muted" />
                <div className="h-px w-full bg-border" />
                <div className="space-y-2">
                  <div className="h-4 w-full rounded bg-muted" />
                  <div className="h-4 w-11/12 rounded bg-muted" />
                  <div className="h-4 w-4/5 rounded bg-muted" />
                </div>
              </div>
            ))}
          </article>
          <div className="hidden lg:block">
            <div className="sticky top-24">
              <div className="rounded-xl border border-border bg-card/50 p-5 backdrop-blur-sm animate-pulse">
                <div className="h-4 w-16 rounded bg-muted mb-4" />
                <div className="space-y-2">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div
                      key={i}
                      className="h-3.5 rounded bg-muted"
                      style={{ width: `${60 + Math.random() * 30}%` }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  if (error || !page) {
    return (
      <header className="mb-10">
        <h1 className="text-center text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
          {fallbackTitle}
        </h1>
        <hr className="mt-8 border-border" />
        <div className="mt-6 space-y-4 text-sm leading-relaxed text-muted-foreground">
          <p className="text-center text-muted-foreground">
            Unable to load this page right now. Please try again later.
          </p>
        </div>
      </header>
    );
  }

  const tocItems: TocItem[] = page.sections.map((s) => ({
    id: s.anchorId,
    label: s.tocLabel,
  }));

  const lastUpdated = new Date(page.updatedAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <>
      <LegalPageHeader
        title={page.title}
        description={page.description}
        effectiveDate={page.effectiveDate}
        lastUpdated={lastUpdated}
      />

      <div className="grid gap-10 lg:grid-cols-[1fr_260px]">
        <article className="min-w-0">
          <LegalSectionRenderer sections={page.sections} />
        </article>

        <TableOfContents items={tocItems} />
      </div>
    </>
  );
}
