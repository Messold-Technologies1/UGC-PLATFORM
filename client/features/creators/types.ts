export interface Creator {
  id: string;
  name: string;
  location: string;
  rating: number;
  reviewCount: number;
  startingPrice: number;
  ordersCompleted: number;
  thumbnail: string;
  previewVideoUrl?: string | null;
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
}

export interface CreatorProfile extends Creator {
  bio: string;
  languages: string[];

  personaTags: string[];

  restrictions: string[];

  travelRadiusKm: number | null;

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
}

export interface AddOn {
  id: string;
  label: string;
  price: number;
  description?: string | null;
}

export interface Review {
  id: string;
  author: string;
  rating: number;
  date: string;
  comment: string;
  brand: string;
}
