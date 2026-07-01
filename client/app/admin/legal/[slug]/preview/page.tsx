"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { LegalPageHeader } from "@/components/legal/legal-page-header";
import { TableOfContents, type TocItem } from "@/components/legal/table-of-contents";
import { LegalSectionRenderer } from "@/components/legal/legal-section-renderer";
import type { LegalPageResponse } from "@/features/admin/types/legal-pages";

import Link from "next/link";
import { ArrowLeft, Eye } from "lucide-react";

export default function AdminLegalPagePreview() {
  const params = useParams();
  const slug = (Array.isArray(params.slug) ? params.slug[0] : params.slug) || "";

  const [page, setPage] = useState<LegalPageResponse | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    try {
      const data = sessionStorage.getItem("legal-preview-data");
      if (data) {
        setPage(JSON.parse(data));
      } else {
        setError(true);
      }
    } catch {
      setError(true);
    }
  }, [slug]);

  if (!page && !error) {
    return <div className="p-20 text-center animate-pulse">Loading preview...</div>;
  }

  if (error || !page) {
    return (
      <div className="p-20 text-center text-red-500">
        Failed to load preview. Ensure you have an active draft.
      </div>
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
    <div className="relative">
      <div className="sticky top-0 z-50 bg-amber-500 text-amber-950 px-4 py-2 flex items-center justify-between font-semibold text-sm shadow-md">
        <div className="flex items-center gap-2">
          <Eye className="size-4" />
          <span>Draft Preview Mode</span>
        </div>
        <Link
          href={`/admin/legal/${slug}`}
          className="flex items-center gap-1 hover:underline"
        >
          <ArrowLeft className="size-4" />
          Back to Editor
        </Link>
      </div>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
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
      </div>
    </div>
  );
}
