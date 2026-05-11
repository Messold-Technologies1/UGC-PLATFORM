export type BriefShootLocationKind =
  | "CREATOR_OWN_SETUP"
  | "OUTDOOR_PUBLIC_LOCATION"
  | "BRAND_SELECTED_LOCATION"
  | "CREATOR_DECIDES";

export type BriefDurationBucket =
  | "SEC_0_15"
  | "SEC_15_30"
  | "SEC_30_45"
  | "SEC_45_60"
  | "SEC_60_100"
  | "NOT_SURE";

export type BriefContentType =
  | "TALKING_VIDEO"
  | "PRODUCT_DEMO"
  | "TESTIMONIAL"
  | "AESTHETIC_REEL"
  | "UGC_AD"
  | "CREATOR_DECIDES";

export type BriefToneStyle =
  | "FUNNY"
  | "EMOTIONAL"
  | "PREMIUM"
  | "CASUAL"
  | "TRENDY"
  | "CREATOR_DECIDES";

export type Brief = {
  id: string;
  brandName?: string | null;
  brandPronunciationAudioKey?: string | null;
  brandPronunciationAudioUrl?: string | null;
  industry?: string | null;
  brandLogoKey?: string | null;
  brandLogoUrl?: string | null;
  productName?: string | null;
  productDescription?: string | null;
  productPageUrl?: string | null;
  willShipPhysicalProductToCreator: boolean;
  shootLocationKind?: BriefShootLocationKind | null;
  shootLocationAddress?: string | null;
  durationBucket?: BriefDurationBucket | null;
  contentType?: BriefContentType | null;
  toneStyle?: BriefToneStyle | null;
  referenceLinks: string[];
  finalNotes?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ListBriefsResponse = {
  items: Brief[];
};

export type CreateBriefPayload = {
  brandName?: string;
  industry?: string;
  brandLogoKey?: string;
  brandLogoUrl?: string;
  brandPronunciationAudioKey?: string;
  brandPronunciationAudioUrl?: string;
  productName?: string;
  productDescription?: string;
  productPageUrl?: string;
  willShipPhysicalProductToCreator?: boolean;
  shootLocationKind?: BriefShootLocationKind;
  shootLocationAddress?: string;
  durationBucket?: BriefDurationBucket;
  contentType?: BriefContentType;
  toneStyle?: BriefToneStyle;
  referenceLinks?: string[];
  finalNotes?: string;
};

export type CreateBriefResponse = {
  id: string;
};
