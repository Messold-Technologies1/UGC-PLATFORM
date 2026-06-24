import type { LegalSectionResponse } from "@/features/admin/types/legal-pages";

interface LegalSectionRendererProps {
  sections: LegalSectionResponse[];
}

const sectionClass = "scroll-mt-24 mb-12 last:mb-0";
const h2Class =
  "text-xl font-bold tracking-tight sm:text-2xl mb-4 pb-3 border-b border-border";

/**
 * Renders an ordered list of legal-page sections with auto-numbering.
 * Content comes from the DB as sanitised HTML and is rendered via
 * `dangerouslySetInnerHTML` (safe because the backend runs sanitize-html
 * on every draft save).
 */
export function LegalSectionRenderer({
  sections,
}: LegalSectionRendererProps) {
  return (
    <>
      {sections.map((section, index) => (
        <section
          key={section.id}
          id={section.anchorId}
          className={sectionClass}
        >
          <h2 className={h2Class}>
            {index + 1}. {section.title}
          </h2>
          <div
            className="legal-content"
            dangerouslySetInnerHTML={{ __html: section.content }}
          />
        </section>
      ))}
    </>
  );
}
