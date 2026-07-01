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
