/**
 * Canonical creator photos used on the public marketing pages
 * (`/`, `/brands`, `/creators`). One identity per image so name, price,
 * location and photo stay in sync everywhere they appear.
 */
export type MarketingCreator = {
  id: string;
  img: string;
  name: string;
  shortName: string;
  category: string;
  city: string;
  location: string;
  price: string;
  delivery: string;
};

export const MARKETING_CREATORS = {
  anju: {
    id: "anju",
    img: "/creators/female-1.png",
    name: "Anju Choudhary",
    shortName: "Anju C.",
    category: "Beauty",
    city: "Jaipur",
    location: "Jaipur",
    price: "₹40,000",
    delivery: "5 days",
  },
  sana: {
    id: "sana",
    img: "/creators/female-2.png",
    name: "Sana Verma",
    shortName: "Sana V.",
    category: "Skincare",
    city: "Noida",
    location: "Noida",
    price: "₹1,900",
    delivery: "2 days",
  },
  punya: {
    id: "punya",
    img: "/creators/female-3.png",
    name: "Punya Prabhakar",
    shortName: "Punya P.",
    category: "Beauty",
    city: "Gurgaon",
    location: "Gurgaon",
    price: "₹2,000",
    delivery: "5 days",
  },
  ananya: {
    id: "ananya",
    img: "/creators/female-4.jpg",
    name: "Ananya Singh",
    shortName: "Ananya S.",
    category: "Parenting",
    city: "Jaipur",
    location: "Jaipur",
    price: "₹2,650",
    delivery: "4 days",
  },
  aashi: {
    id: "aashi",
    img: "/creators/female-5.png",
    name: "Aashi Chouhan",
    shortName: "Aashi C.",
    category: "Lifestyle",
    city: "Jaisalmer",
    location: "Jaisalmer",
    price: "₹3,000",
    delivery: "5 days",
  },
  disha: {
    id: "disha",
    img: "/creators/female-6.jpg",
    name: "Disha Gupta",
    shortName: "Disha G.",
    category: "Skincare",
    city: "Mohali",
    location: "Mohali",
    price: "₹2,000",
    delivery: "5 days",
  },
  sakshi: {
    id: "sakshi",
    img: "/creators/female-7.jpg",
    name: "Sakshi Agarwal",
    shortName: "Sakshi A.",
    category: "Parenting",
    city: "Thane",
    location: "Thane",
    price: "₹1,000",
    delivery: "3 days",
  },
  kabir: {
    id: "kabir",
    img: "/creators/male-1.jpg",
    name: "Kabir Shah",
    shortName: "Kabir S.",
    category: "Fitness",
    city: "Navi Mumbai",
    location: "Navi Mumbai",
    price: "₹5,200",
    delivery: "4 days",
  },
  suresh: {
    id: "suresh",
    img: "/creators/male-2.jpg",
    name: "Suresh M",
    shortName: "Suresh M.",
    category: "Fashion",
    city: "Hyderabad",
    location: "Hyderabad",
    price: "₹4,500",
    delivery: "3 days",
  },
  yash: {
    id: "yash",
    img: "/creators/male-3.png",
    name: "YASH TYAGI",
    shortName: "Yash T.",
    category: "Fitness",
    city: "Ghaziabad",
    location: "Ghaziabad",
    price: "₹2000",
    delivery: "3 days",
  },
  couple: {
    id: "couple",
    img: "/creators/couple.png",
    name: "Yashwant Sharma",
    shortName: "Yashwant S.",
    category: "Couple",
    city: "New Delhi",
    location: "New Delhi",
    price: "₹2000",
    delivery: "5 days",
  },
} as const satisfies Record<string, MarketingCreator>;

export type MarketingCreatorId = keyof typeof MARKETING_CREATORS;

export const MARKETING_CREATOR_LIST: MarketingCreator[] = Object.values(
  MARKETING_CREATORS,
);

/** Category → catalog creator, so photo, price and tag stay in sync. */
export const MARKETING_CREATOR_BY_NICHE = {
  beauty: MARKETING_CREATORS.anju,
  fashion: MARKETING_CREATORS.suresh,
  lifestyle: MARKETING_CREATORS.aashi,
  skincare: MARKETING_CREATORS.disha,
  fitness: MARKETING_CREATORS.yash,
  couple: MARKETING_CREATORS.couple,
  parenting: MARKETING_CREATORS.sakshi,
} as const;

export const MARKETING_CREATOR_IMAGES = {
  beauty: MARKETING_CREATOR_BY_NICHE.beauty.img,
  fashion: MARKETING_CREATOR_BY_NICHE.fashion.img,
  lifestyle: MARKETING_CREATOR_BY_NICHE.lifestyle.img,
  skincare: MARKETING_CREATOR_BY_NICHE.skincare.img,
  fitness: MARKETING_CREATOR_BY_NICHE.fitness.img,
  couple: MARKETING_CREATOR_BY_NICHE.couple.img,
  parenting: MARKETING_CREATOR_BY_NICHE.parenting.img,
} as const;

export function creatorMeta(creator: MarketingCreator): string {
  return `${creator.category} · ${creator.city}`;
}

export function creatorRole(creator: MarketingCreator): string {
  return `${creator.category} creator, ${creator.city}`;
}
