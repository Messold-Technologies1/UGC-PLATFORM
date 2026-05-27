"use client";

import { Info, MessageCircle, Star } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import type { OrderCreatorSnapshot, OrderDetailsPublic } from "../../api/types";

interface CreatorProfileCardProps {
  creator: OrderCreatorSnapshot;
  order: OrderDetailsPublic;
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}



export function CreatorProfileCard({
  creator,
  order,
}: CreatorProfileCardProps) {
  const creatorName = creator.displayName || "Creator";

  return (
    <div className="rounded-lg border bg-card p-6 shadow-sm flex flex-col h-full">
      <h3 className="text-lg font-bold text-foreground mb-6">Creator</h3>

      <div className="flex items-start gap-4">
        <Avatar className="size-14 border-2 border-primary/20 shrink-0">
          <AvatarImage
            src={creator.profileImageUrl || undefined}
            alt={creatorName}
          />
          <AvatarFallback className="text-lg font-bold bg-primary/10 text-primary">
            {getInitials(creatorName)}
          </AvatarFallback>
        </Avatar>

        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="text-sm font-bold text-foreground">
              {creatorName}
            </h4>
            <Badge className="rounded-full bg-primary/10 text-primary border-primary/20 text-[10px] font-semibold px-2 py-0">
              Top Creator
            </Badge>
          </div>

          <p className="text-xs text-muted-foreground mt-0.5">
            {creator.city ? `${creator.city}, India` : "India"} • Hindi, English
          </p>

          <div className="flex items-center gap-1.5 mt-1">
            <Star className="size-3.5 fill-amber-400 text-amber-400" />
            <span className="text-xs font-semibold text-foreground">4.9</span>
            <span className="text-xs text-muted-foreground underline underline-offset-2">
              (126 reviews)
            </span>
          </div>
        </div>
      </div>

      <div className="mt-auto pt-6 flex items-center gap-3">
        <Button
          variant="outline"
          className="flex-1 rounded-xl text-sm font-semibold h-11"
          asChild
        >
          <Link href={`/brand/creators/${creator.id}`}>
            View Profile
          </Link>
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="size-11 shrink-0 rounded-xl"
        >
          <MessageCircle className="size-5 text-muted-foreground" />
        </Button>
      </div>
    </div>
  );
}
