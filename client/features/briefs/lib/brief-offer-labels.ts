export const BRIEF_TYPE_COPY = {
  product: {
    tab: "Product",
    cardBlurb: "Send a physical product to the creator.",
    title: "Physical product",
    description:
      "Choose this when you want to send a physical product to the creator and have them include it in the video.",
  },
  service: {
    tab: "Service",
    cardBlurb: "Promote a service or digital offering.",
    title: "Digital service",
    description:
      "Choose this when you don't have a physical product to ship — for example an app, website, or any other digital or in-person service.",
  },
} as const;

/** UI labels for product vs service briefs (DB columns stay productName, etc.). */
export function getBriefOfferLabels(isProduct: boolean) {
  const kind = isProduct ? "Product" : "Service";
  const kindLower = kind.toLowerCase();

  return {
    sectionTitle: `${kind} Details`,
    sectionInfoTitle: `${kind} Info`,
    name: `${kind} Name`,
    description: `${kind} Description`,
    pageUrl: `${kind} URL`,
    pageUrlOptional: `${kind} URL`,
    pageLink: `${kind} page`,
    viewPage: `View ${kindLower}`,
    image: `${kind} Image`,
    reviewSectionTitle: kind,
    summaryDetails: `${kind} Details`,
    nameOrService: isProduct ? "Product / service" : "Service",
  } as const;
}
