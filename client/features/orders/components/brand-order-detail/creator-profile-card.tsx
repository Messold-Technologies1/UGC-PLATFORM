"use client";

import { MessageCircle } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
  order: _order,
}: Readonly<CreatorProfileCardProps>) {
  const creatorLabel = creator.displayName || "Creator";
  const languageText = creator.languages?.filter(Boolean).join(", ") ?? "";

  return (
    <div className="rounded-lg border bg-card p-6 shadow-sm flex flex-col h-full">
      <h3 className="text-lg font-bold text-foreground mb-6">Creator</h3>

      <div className="flex items-start gap-4">
        <Avatar className="size-14 border-2 border-primary/20 shrink-0">
          <AvatarImage
            src={creator.profileImageUrl || undefined}
            alt={creatorLabel}
          />
          <AvatarFallback className="text-lg font-bold bg-primary/10 text-primary">
            {getInitials(creatorLabel)}
          </AvatarFallback>
        </Avatar>

        <div className="min-w-0">
          <h4 className="text-sm font-bold text-foreground">Creator</h4>

          {creator.city ? (
            <p className="text-xs text-muted-foreground mt-0.5">
              {creator.city}
            </p>
          ) : null}

          {languageText ? (
            <p className="text-xs text-muted-foreground mt-1">
              {languageText}
            </p>
          ) : null}

          {creator.primaryNiche ? (
            <p className="text-xs font-medium text-foreground mt-1">
              Primary niche:{" "}
              <span className="text-muted-foreground">{creator.primaryNiche}</span>
            </p>
          ) : null}
        </div>
      </div>

      <div className="mt-auto pt-6 flex items-center gap-3">
        <Button
          variant="outline"
          className="flex-1 rounded-xl text-sm font-semibold h-11"
          asChild
        >
          <Link href={`/brand/creators?creatorId=${creator.id}`}>
            View Profile
          </Link>
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="size-11 shrink-0 rounded-xl"
          asChild
        >
          <Link href="/brand/messages">
            <MessageCircle className="size-5 text-muted-foreground" />
          </Link>
        </Button>
      </div>
    </div>
  );
}
