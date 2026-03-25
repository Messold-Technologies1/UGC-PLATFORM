import type { AddOn } from "../types";

/** Platform default add-ons shown on creator profiles until backed by API. */
export const DEFAULT_CREATOR_ADD_ONS: AddOn[] = [
  { id: "addon-travel", label: "Travel fee", price: 1000 },
  { id: "addon-editing", label: "Advanced editing", price: 800 },
  { id: "addon-script", label: "Script writing", price: 500 },
  { id: "addon-express", label: "Express delivery", price: 700 },
];
