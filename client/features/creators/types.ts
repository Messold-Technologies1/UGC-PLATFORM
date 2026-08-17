export interface Creator {
  id: string;
  name: string;
  location: string;
  rating: number;
  reviewCount: number;
  startingPrice: number;
  ordersCompleted: number;
  collaborationCount: number;
  thumbnail: string;
  previewVideoUrl?: string | null;
  introVideoUrl?: string | null;
  previewVideoThumbnail?: string | null;
  tags: string[];
  available: boolean;
  storeVisit: boolean;
  travelAvailable: boolean;
  gender: "male" | "female" | "other";

  category: string;

  categories: string[];
  industryLabel?: string;
  languages: string[];
  deliveryDays: number;
  basicEditing?: boolean;
  /** Present when unavailable now — ISO date YYYY-MM-DD */
  unavailableFrom?: string | null;
  unavailableTo?: string | null;
}

export interface CreatorProfile extends Creator {
  bio: string;
  languages: string[];
  profileLanguages: { label: string }[];

  personaTags: string[];

  restrictions: string[];

  travelRadiusKm: number | null;

  facetSelections: {
    dimension: string;
    slug: string;
    label: string;
  }[];

  packages: Package[];
  addOns: AddOn[];
  reviews: Review[];
}

export interface Package {
  id: string;
  tier: "basic" | "standard" | "premium";
  label: string;
  price: number;
  deliveryDays: number;
  revisions: number;
  features: string[];
  videoLengthSeconds?: number;
}

export interface AddOn {
  id: string;
  label: string;
  price: number;
}

export interface Review {
  id: string;
  author: string;
  rating: number;
  date: string;
  comment: string;
  brand: string;
}
