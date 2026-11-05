import type { ComponentType } from "react";
import { V1Template } from "./v1/v1-template";
import { V2Template } from "./v2/v2-template";
import { V3Template } from "./v3/v3-template";
import { V4Template } from "./v4/v4-template";
import { V5Template } from "./v5/v5-template";
import { V6Template } from "./v6/v6-template";
import { V7Template } from "./v7/v7-template";
import { V8Template } from "./v8/v8-template";
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
    id: "v1",
    name: "Classic",
    tagline: "Soft gradient hero, reel alongside, bordered About table.",
    Component: V1Template,
  },
  {
    id: "v2",
    name: "Showcase",
    tagline: "Reel-first hero with the About facts promoted into it.",
    Component: V2Template,
  },
  {
    id: "v3",
    name: "Editorial",
    tagline: "Oversized type, tiled overview, sticky booking panel.",
    Component: V3Template,
  },
  {
    id: "v4",
    name: "Panels",
    tagline: "Soft white cards on grey, with a pill nav and booking card.",
    Component: V4Template,
  },
  {
    id: "v5",
    name: "Spotlight",
    tagline: "Pinned profile card and a saturated booking panel.",
    Component: V5Template,
  },
  {
    id: "v6",
    name: "Pastel",
    tagline: "Tinted gradient field, pinned card, image-led package.",
    Component: V6Template,
  },
  {
    id: "v7",
    name: "Signal",
    tagline: "Pastel layout with a dark, chart-led audience section.",
    Component: V7Template,
  },
  {
    id: "v8",
    name: "Profile",
    tagline: "Wide banner card, About table, outlined audience panel.",
    Component: V8Template,
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
