import type { JsonLdSchema } from "@/lib/seo/structured-data";

/**
 * Renders a schema.org graph as a JSON-LD script tag.
 *
 * A plain `<script>` rather than `next/script`: structured data has to be in
 * the HTML the crawler receives, and `next/script` defers injection to the
 * client for every strategy that would apply here.
 *
 * `<` is escaped because the payload carries editorial copy. Without it, a `<`
 * in an FAQ answer could close the script element early and put the remainder
 * of the JSON into the document as markup.
 */
export function JsonLd({
  id,
  schema,
}: {
  id: string;
  schema: JsonLdSchema;
}) {
  return (
    <script
      id={id}
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(schema).replace(/</g, "\\u003c"),
      }}
    />
  );
}
