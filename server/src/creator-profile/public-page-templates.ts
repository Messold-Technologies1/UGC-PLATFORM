/**
 * Public-page template ids a creator may select.
 *
 * Mirrors the client registry at
 * `client/features/creators/components/public-creator-profile/templates/registry.ts`.
 * Adding a template means adding its id here and its entry there. The client
 * falls back to the default for ids it cannot render, so a value stored here
 * that the client does not know is degraded, never fatal.
 */
export const PUBLIC_PAGE_TEMPLATE_IDS = [
  'v1',
  'v2',
  'v3',
  'v4',
  'v5',
  'v6',
  'v7',
  'v8',
] as const;

export type PublicPageTemplateId = (typeof PUBLIC_PAGE_TEMPLATE_IDS)[number];

export const DEFAULT_PUBLIC_PAGE_TEMPLATE_ID: PublicPageTemplateId = 'v3';

export function isPublicPageTemplateId(
  value: unknown,
): value is PublicPageTemplateId {
  return (
    typeof value === 'string' &&
    (PUBLIC_PAGE_TEMPLATE_IDS as readonly string[]).includes(value)
  );
}
