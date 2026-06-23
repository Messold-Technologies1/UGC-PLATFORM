"use client";

import Image from "next/image";
import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Leaf,
  Sparkles,
  Shirt,
  Smartphone,
  UtensilsCrossed,
  PawPrint,
  Baby,
  Cpu,
  Home,
  Play,
  Pause,
  Star,
  MapPin,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { MARKETING_CREATOR_IMAGES as img } from "@/components/landing/marketing/marketing-creator-images";
import {
  marketingShell,
  marketingSectionPadY,
} from "@/components/landing/marketing/marketing-layout";
import { PillButton } from "@/components/landing/marketing/pill-button";


type Creator = {
  name: string;
  rating: number;
  location: string;
  price: string;
  types: string;
  badge: string;
  image: string;
  video?: string;
};

const NICHES: {
  id: string;
  label: string;
  icon: typeof Leaf;
  creators: Creator[];
}[] = [
  {
    id: "wellness",
    label: "Health & Wellness",
    icon: Leaf,
    creators: [
      {
        name: "Rosh",
        rating: 5.0,
        location: "Canada",
        price: "₹7,000",
        types: "UGC Ads | Product Demo",
        badge: "Health & Wellness",
        image: img.fitness,
        video: "/1.mp4",
      },
      {
        name: "Anaya",
        rating: 4.9,
        location: "India",
        price: "₹5,000",
        types: "Wellness Reel | Supplement Review",
        badge: "Health & Wellness",
        image: img.skincare,
        video: "/2.mp4",
      },
      {
        name: "Kabir",
        rating: 4.8,
        location: "India",
        price: "₹6,500",
        types: "Fitness UGC | Product Demo",
        badge: "Health & Wellness",
        image: img.fitness,
        video: "/3.mp4",
      },
      {
        name: "Mira",
        rating: 4.7,
        location: "India",
        price: "₹5,500",
        types: "Yoga Reel | Self-Care",
        badge: "Health & Wellness",
        image: img.beauty,
        video: "/4.mp4",
      },
      {
        name: "Tanya",
        rating: 4.9,
        location: "UAE",
        price: "₹6,800",
        types: "Nutrition Demo",
        badge: "Health & Wellness",
        image: img.food,
        video: "/5.mp4",
      },
    ],
  },
  {
    id: "beauty",
    label: "Cosmetics & Beauty",
    icon: Sparkles,
    creators: [
      {
        name: "Meera",
        rating: 5.0,
        location: "India",
        price: "₹6,000",
        types: "Skincare Demo | GRWM",
        badge: "Beauty Creator",
        image: img.beauty,
      },
      {
        name: "Zara",
        rating: 4.9,
        location: "UAE",
        price: "₹8,000",
        types: "Makeup Reel | Review",
        badge: "Beauty Creator",
        image: img.skincare,
      },
      {
        name: "Riya",
        rating: 4.8,
        location: "India",
        price: "₹5,500",
        types: "Haircare UGC | Demo",
        badge: "Beauty Creator",
        image: img.beauty,
      },
      {
        name: "Ishika",
        rating: 4.7,
        location: "India",
        price: "₹5,000",
        types: "Lipstick Try-On",
        badge: "Beauty Creator",
        image: img.skincare,
      },
      {
        name: "Naina",
        rating: 4.9,
        location: "India",
        price: "₹7,500",
        types: "GRWM | Review",
        badge: "Beauty Creator",
        image: img.beauty,
      },
    ],
  },
  {
    id: "fashion",
    label: "Apparel & Fashion",
    icon: Shirt,
    creators: [
      {
        name: "Kartik",
        rating: 4.9,
        location: "India",
        price: "₹7,000",
        types: "Styling Reel | Try-On",
        badge: "Fashion UGC",
        image: img.fashion,
      },
      {
        name: "Juhi",
        rating: 5.0,
        location: "India",
        price: "₹10,000",
        types: "Outfit Reel | UGC",
        badge: "Fashion UGC",
        image: img.fashion,
      },
      {
        name: "Bhavya",
        rating: 4.8,
        location: "India",
        price: "₹9,000",
        types: "Product Styling | UGC Ad",
        badge: "Fashion UGC",
        image: img.fashion,
      },
      {
        name: "Aarav",
        rating: 4.7,
        location: "India",
        price: "₹6,500",
        types: "Streetwear Reel",
        badge: "Fashion UGC",
        image: img.fashion,
      },
      {
        name: "Nira",
        rating: 4.9,
        location: "India",
        price: "₹8,500",
        types: "Ethnicwear Try-On",
        badge: "Fashion UGC",
        image: img.fashion,
      },
    ],
  },
  {
    id: "apps",
    label: "Apps & Digital Services",
    icon: Smartphone,
    creators: [
      {
        name: "Veer",
        rating: 4.8,
        location: "India",
        price: "₹6,000",
        types: "App Demo | Walkthrough",
        badge: "Apps & Digital",
        image: img.tech,
      },
      {
        name: "Sneha",
        rating: 4.9,
        location: "India",
        price: "₹7,000",
        types: "SaaS UGC | Tutorial",
        badge: "Apps & Digital",
        image: img.tech,
      },
      {
        name: "Rahul",
        rating: 4.7,
        location: "India",
        price: "₹5,500",
        types: "App Review",
        badge: "Apps & Digital",
        image: img.tech,
      },
      {
        name: "Pia",
        rating: 4.8,
        location: "India",
        price: "₹6,500",
        types: "Digital Service Demo",
        badge: "Apps & Digital",
        image: img.tech,
      },
      {
        name: "Om",
        rating: 4.9,
        location: "India",
        price: "₹7,200",
        types: "Onboarding UGC",
        badge: "Apps & Digital",
        image: img.tech,
      },
    ],
  },
  {
    id: "food",
    label: "Food & Beverage",
    icon: UtensilsCrossed,
    creators: [
      {
        name: "Arjun",
        rating: 4.9,
        location: "India",
        price: "₹5,000",
        types: "Taste Test | Review",
        badge: "Food & Beverage",
        image: img.food,
      },
      {
        name: "Sana",
        rating: 4.8,
        location: "India",
        price: "₹6,000",
        types: "Recipe Reel | Demo",
        badge: "Food & Beverage",
        image: img.food,
      },
      {
        name: "Dev",
        rating: 4.7,
        location: "India",
        price: "₹4,500",
        types: "Snack Review | UGC Ad",
        badge: "Food & Beverage",
        image: img.food,
      },
      {
        name: "Kiara",
        rating: 4.9,
        location: "India",
        price: "₹6,500",
        types: "Cafe Review",
        badge: "Food & Beverage",
        image: img.food,
      },
      {
        name: "Yug",
        rating: 4.8,
        location: "India",
        price: "₹5,800",
        types: "Beverage Demo",
        badge: "Food & Beverage",
        image: img.food,
      },
    ],
  },
  {
    id: "pets",
    label: "Pets",
    icon: PawPrint,
    creators: [
      {
        name: "Tia",
        rating: 4.9,
        location: "India",
        price: "₹5,500",
        types: "Pet Product Demo",
        badge: "Pets",
        image: img.beauty,
      },
      {
        name: "Rehan",
        rating: 4.8,
        location: "India",
        price: "₹6,000",
        types: "Pet Food Review",
        badge: "Pets",
        image: img.food,
      },
      {
        name: "Maya",
        rating: 4.7,
        location: "India",
        price: "₹5,000",
        types: "Pet Care UGC",
        badge: "Pets",
        image: img.skincare,
      },
      {
        name: "Veda",
        rating: 4.9,
        location: "India",
        price: "₹6,500",
        types: "Pet Toy Reel",
        badge: "Pets",
        image: img.fashion,
      },
      {
        name: "Sam",
        rating: 4.8,
        location: "India",
        price: "₹5,800",
        types: "Pet Lifestyle",
        badge: "Pets",
        image: img.fitness,
      },
    ],
  },
  {
    id: "family",
    label: "Children & Family",
    icon: Baby,
    creators: [
      {
        name: "Pooja",
        rating: 4.9,
        location: "India",
        price: "₹6,500",
        types: "Parenting UGC | Review",
        badge: "Children & Family",
        image: img.skincare,
      },
      {
        name: "Anand",
        rating: 4.8,
        location: "India",
        price: "₹6,000",
        types: "Family Reel | Demo",
        badge: "Children & Family",
        image: img.food,
      },
      {
        name: "Rhea",
        rating: 4.9,
        location: "India",
        price: "₹7,000",
        types: "Mom Creator | UGC",
        badge: "Children & Family",
        image: img.beauty,
      },
      {
        name: "Kabir",
        rating: 4.7,
        location: "India",
        price: "₹5,500",
        types: "Kid Product Demo",
        badge: "Children & Family",
        image: img.fashion,
      },
      {
        name: "Simi",
        rating: 4.8,
        location: "India",
        price: "₹6,200",
        types: "Family Lifestyle",
        badge: "Children & Family",
        image: img.fitness,
      },
    ],
  },
  {
    id: "tech",
    label: "Technology & Gadgets",
    icon: Cpu,
    creators: [
      {
        name: "Neil",
        rating: 4.9,
        location: "India",
        price: "₹8,000",
        types: "Gadget Review | Unboxing",
        badge: "Tech Creator",
        image: img.tech,
      },
      {
        name: "Ishan",
        rating: 4.8,
        location: "India",
        price: "₹7,500",
        types: "App Demo | Tech Explainer",
        badge: "Tech Creator",
        image: img.tech,
      },
      {
        name: "Tara",
        rating: 4.8,
        location: "India",
        price: "₹7,000",
        types: "Product Demo | Comparison",
        badge: "Tech Creator",
        image: img.tech,
      },
      {
        name: "Dhruv",
        rating: 4.7,
        location: "India",
        price: "₹6,500",
        types: "Gadget Unboxing",
        badge: "Tech Creator",
        image: img.tech,
      },
      {
        name: "Aria",
        rating: 4.9,
        location: "India",
        price: "₹8,500",
        types: "Tech Lifestyle",
        badge: "Tech Creator",
        image: img.tech,
      },
    ],
  },
  {
    id: "home",
    label: "Home & Lifestyle",
    icon: Home,
    creators: [
      {
        name: "Nisha",
        rating: 4.9,
        location: "India",
        price: "₹6,500",
        types: "Home Decor Reel",
        badge: "Home & Lifestyle",
        image: img.beauty,
      },
      {
        name: "Vir",
        rating: 4.8,
        location: "India",
        price: "₹6,000",
        types: "Lifestyle UGC",
        badge: "Home & Lifestyle",
        image: img.fashion,
      },
      {
        name: "Aanya",
        rating: 4.9,
        location: "India",
        price: "₹7,000",
        types: "Home Product Demo",
        badge: "Home & Lifestyle",
        image: img.skincare,
      },
      {
        name: "Reet",
        rating: 4.7,
        location: "India",
        price: "₹5,500",
        types: "Cleaning Reel",
        badge: "Home & Lifestyle",
        image: img.food,
      },
      {
        name: "Kiaan",
        rating: 4.8,
        location: "India",
        price: "₹6,800",
        types: "Home Tour",
        badge: "Home & Lifestyle",
        image: img.fitness,
      },
    ],
  },
];

function ReelCard({
  c,
  active,
  partial,
}: {
  c: Creator;
  active?: boolean;
  partial?: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    if (active) {
      videoRef.current?.play().catch(() => {});
    } else {
      videoRef.current?.pause();
    }
  }, [active]);

  const togglePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (videoRef.current) {
      if (videoRef.current.paused) {
        videoRef.current.play().catch(() => {});
      } else {
        videoRef.current.pause();
      }
    }
  };

  return (
    <div
      className={[
        "group relative shrink-0 overflow-hidden rounded-[32px] transition-all duration-500",
        active
          ? "z-50 aspect-[9/16] w-[280px] scale-100 shadow-2xl ring-2 ring-background sm:w-[320px]"
          : partial
            ? "z-30 aspect-[9/16] w-[160px] opacity-70 sm:w-[200px]"
            : "z-10 aspect-[9/16] w-[200px] opacity-90 sm:w-[240px]",
      ].join(" ")}
    >
      {c.video ? (
        <>
          <video
            ref={videoRef}
            src={c.video}
            loop
            muted
            playsInline
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            className="absolute inset-0 h-full w-full object-cover"
          />
          {active && (
            <div 
              onClick={togglePlay}
              className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity duration-300 group-hover:opacity-100 bg-black/20 cursor-pointer"
            >
              <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-background bg-background/95 shadow-2xl transition-transform hover:scale-110">
                {isPlaying ? (
                  <Pause className="fill-foreground text-foreground h-6 w-6" />
                ) : (
                  <Play className="fill-foreground text-foreground ml-0.5 h-6 w-6" />
                )}
              </div>
            </div>
          )}
        </>
      ) : (
        <Image
          src={c.image}
          alt={`${c.name} – ${c.badge}`}
          fill
          sizes="(max-width: 768px) 280px, 320px"
          className="object-cover"
        />
      )}
    </div>
  );
}

export function CreatorNiche() {
  const [activeNiche, setActiveNiche] = useState(NICHES[0].id);
  const [centerIdx, setCenterIdx] = useState(2);

  const niche = NICHES.find((n) => n.id === activeNiche)!;
  const list = niche.creators;
  const len = list.length;

  const wrap = (i: number) => (i + len) % len;
  const visible = [
    { c: list[wrap(centerIdx - 2)], partial: true },
    { c: list[wrap(centerIdx - 1)] },
    { c: list[centerIdx], active: true },
    { c: list[wrap(centerIdx + 1)] },
    { c: list[wrap(centerIdx + 2)], partial: true },
  ];

  return (
    <section id="niches" className="bg-sky/30">
      <div className={`${marketingShell} ${marketingSectionPadY}`}>
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="font-heading text-4xl font-bold tracking-tight text-balance sm:text-5xl lg:text-6xl">
            Creator Marketing Starts With Niche-Fit Talent
          </h2>
          <p className="mt-5 text-lg text-foreground/70 text-balance">
            Explore creators by category and find the right match for your product, audience, and
            campaign style.
          </p>
        </div>

        <div className="mt-10 flex gap-2 overflow-x-auto pb-2 lg:flex-wrap lg:justify-center lg:overflow-visible">
          {NICHES.map(({ id, label, icon: Icon }) => {
            const active = id === activeNiche;
            return (
              <button
                key={id}
                type="button"
                onClick={() => {
                  setActiveNiche(id);
                  setCenterIdx(2);
                }}
                className={[
                  "inline-flex shrink-0 items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold transition-all",
                  active
                    ? "bg-background text-foreground shadow-md"
                    : "bg-background/40 text-foreground/60 hover:bg-background/70 hover:text-foreground",
                ].join(" ")}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            );
          })}
        </div>

        <div className="relative mt-12">
          <div className="hidden items-center justify-center gap-4 md:flex lg:gap-6 overflow-hidden py-4 px-4 min-h-[600px]">
            <AnimatePresence mode="popLayout">
              {visible.map((v) => (
                <motion.div
                  key={v.c.name}
                  layout
                  transition={{ duration: 0.4, ease: "easeInOut" }}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                >
                  <ReelCard
                    c={v.c}
                    active={v.active}
                    partial={v.partial}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          <div className="flex items-center justify-center md:hidden overflow-hidden py-4">
            <AnimatePresence mode="wait">
              <motion.div
                key={list[centerIdx].name}
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                transition={{ duration: 0.4, ease: "easeInOut" }}
              >
                <ReelCard c={list[centerIdx]} active />
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="mt-8 flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => setCenterIdx((i) => wrap(i - 1))}
              className="border-foreground/10 flex h-11 w-11 items-center justify-center rounded-full border bg-background transition-colors hover:bg-foreground hover:text-background"
              aria-label="Previous creator"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-1.5">
              {list.map((_, i) => (
                <span
                  key={i}
                  className={`h-1.5 rounded-full transition-all ${i === centerIdx ? "w-6 bg-foreground" : "w-1.5 bg-foreground/30"}`}
                />
              ))}
            </div>
            <button
              type="button"
              onClick={() => setCenterIdx((i) => wrap(i + 1))}
              className="border-foreground/10 flex h-11 w-11 items-center justify-center rounded-full border bg-background transition-colors hover:bg-foreground hover:text-background"
              aria-label="Next creator"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="mt-14 text-center">
          <PillButton variant="primary" arrow href="/brand/creators">
            Browse creators by niche
          </PillButton>
          <p className="text-foreground/65 mx-auto mt-4 max-w-xl text-sm">
            Not sure who fits your brand? Explore creator categories and shortlist the ones that
            match your product vibe.
          </p>
        </div>
      </div>
    </section>
  );
}
