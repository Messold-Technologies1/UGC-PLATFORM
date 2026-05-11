import { MapPin, Play, Star } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Sticker } from "@/components/landing/marketing/sticker";

interface CreatorCardProps {
  image: string;
  name: string;
  niches: string[];
  location: string;
  price: string;
  rating: number;
  delivery: string;
  badge?: { tone: "lime" | "pink" | "sky" | "grape"; label: string };
}

export function CreatorCard({
  image,
  name,
  niches,
  location,
  price,
  rating,
  delivery,
  badge,
}: CreatorCardProps) {
  return (
    <article className="border-foreground/90 bg-card shadow-pop group hover:shadow-hard relative overflow-hidden rounded-3xl border-2 transition-all duration-300 hover:-translate-y-1">
      <div className="bg-muted relative aspect-[3/4] overflow-hidden">
        <Image
          src={image}
          alt={`${name}, ${niches.join(", ")} creator`}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          className="object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="border-foreground bg-background/95 shadow-hard flex h-14 w-14 items-center justify-center rounded-full border-2 transition-transform duration-300 group-hover:scale-110">
            <Play className="fill-foreground text-foreground ml-0.5 h-5 w-5" />
          </div>
        </div>
        <div className="border-foreground/10 absolute left-3 top-3 inline-flex items-center gap-1 rounded-full border bg-background/95 px-2.5 py-1 text-xs font-bold">
          <Star className="fill-foreground h-3 w-3" /> {rating.toFixed(1)}
        </div>
        {badge ? (
          <div className="absolute right-3 top-3">
            <Sticker tone={badge.tone}>{badge.label}</Sticker>
          </div>
        ) : null}
        <div className="bg-foreground absolute bottom-3 left-3 rounded-full px-3 py-1 text-xs font-bold text-background">
          From {price}
        </div>
      </div>

      <div className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="font-heading text-base leading-tight font-bold">{name}</h3>
            <p className="text-muted-foreground mt-0.5 inline-flex items-center gap-1 text-xs">
              <MapPin className="h-3 w-3" /> {location}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {niches.map((n) => (
            <span
              key={n}
              className="bg-secondary text-secondary-foreground rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
            >
              {n}
            </span>
          ))}
        </div>
        <div className="border-border flex items-center justify-between border-t pt-3">
          <span className="text-muted-foreground text-xs">{delivery}</span>
          <Link
            href="/brand/creators"
            className="group-hover:bg-pink rounded-full bg-foreground px-3.5 py-1.5 text-xs font-semibold text-background transition-colors group-hover:text-pink-foreground"
          >
            View Profile
          </Link>
        </div>
      </div>
    </article>
  );
}
