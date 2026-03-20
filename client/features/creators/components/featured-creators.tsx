import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CreatorCard } from "./creator-card";
import { MOCK_CREATORS } from "../data";

export function FeaturedCreators() {
  const featured = MOCK_CREATORS.slice(0, 4);

  return (
    <section className="mx-auto max-w-[1440px] px-4 py-24 sm:px-6 lg:px-8">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Featured <span className="underline decoration-2 underline-offset-4">Creators</span>
          </h2>
          <p className="mt-2 max-w-lg text-muted-foreground">
            Top-rated creators ready to produce scroll-stopping content for your brand.
          </p>
        </div>
        <Link href="/brand/creators" className="hidden sm:block">
          <Button variant="outline" className="gap-1.5">
            Browse All
            <ArrowRight className="size-4" />
          </Button>
        </Link>
      </div>

      <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {featured.map((creator) => (
          <CreatorCard key={creator.id} creator={creator} variant="featured" />
        ))}
      </div>

      <div className="mt-8 text-center sm:hidden">
        <Link href="/brand/creators">
          <Button variant="outline" className="gap-1.5">
            Browse All Creators
            <ArrowRight className="size-4" />
          </Button>
        </Link>
      </div>
    </section>
  );
}
