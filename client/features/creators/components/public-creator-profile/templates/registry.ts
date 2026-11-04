import type { ComponentType } from "react";
import { V3Template } from "./v3/v3-template";
import type { PublicProfileViewModel } from "./types";

export type PublicPageTemplateComponent = ComponentType<{
  model: PublicProfileViewModel;
}>;

export type PublicPageTemplate = {
  id: string;
  /** Shown on the picker card. */
  name: string;
  /** One line describing the look, shown under the name. */
  tagline: string;
  Component: PublicPageTemplateComponent;
};

/**
 * Every public-page template a creator can choose.
 *
 * Single source of truth for the public route, the settings picker and the
 * preview. Adding a template is one entry here plus its component — no
 * migration, because `CreatorProfile.publicPageTemplate` stores a plain string.
 */
export const PUBLIC_PAGE_TEMPLATES: PublicPageTemplate[] = [
  {
    id: "v3",
    name: "Editorial",
    tagline: "Oversized type, tiled overview, sticky booking panel.",
    Component: V3Template,
  },
];

/** Applied to new creators and used whenever a stored id is unknown. */
export const DEFAULT_PUBLIC_PAGE_TEMPLATE_ID = "v3";

export const PUBLIC_PAGE_TEMPLATE_IDS = PUBLIC_PAGE_TEMPLATES.map(
  (template) => template.id,
);

export function isPublicPageTemplateId(value: unknown): value is string {
  return (
    typeof value === "string" &&
    PUBLIC_PAGE_TEMPLATES.some((template) => template.id === value)
  );
}

/**
 * Resolve a stored template id to a renderable template.
 *
 * Falls back to the default rather than throwing, so retiring a template never
 * breaks the public pages of creators still pointing at it.
 */
export function resolvePublicPageTemplate(
  id: string | null | undefined,
): PublicPageTemplate {
  const match = PUBLIC_PAGE_TEMPLATES.find((template) => template.id === id);
  if (match) return match;
  return (
    PUBLIC_PAGE_TEMPLATES.find(
      (template) => template.id === DEFAULT_PUBLIC_PAGE_TEMPLATE_ID,
    ) ?? PUBLIC_PAGE_TEMPLATES[0]
  );
}
