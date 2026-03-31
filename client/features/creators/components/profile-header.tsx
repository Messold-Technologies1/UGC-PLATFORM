import { memo, useMemo } from "react";
import Image from "next/image";
import {
  MapPin,
  Star,
  CheckCircle2,
  MessageSquare,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { CreatorProfile } from "../types";

interface ProfileHeaderProps {
  creator: CreatorProfile;
}

function isRemoteImage(src: string): boolean {
  return src.startsWith("http://") || src.startsWith("https://");
}

export const ProfileHeader = memo(function ProfileHeader({
  creator,
}: ProfileHeaderProps) {
  const initials = useMemo(
    () =>
      creator.name
        .split(" ")
        .filter(Boolean)
        .map((n) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase() || "?",
    [creator.name],
  );

  const attributeRows = useMemo(() => {
    const rows: { ok: boolean; text: string }[] = [];

    if (creator.travelRadiusKm != null && creator.travelRadiusKm > 0) {
      rows.push({
        ok: true,
        text: `Travels up to ${creator.travelRadiusKm} km`,
      });
    }

    if (creator.storeVisit) {
      rows.push({
        ok: true,
        text: "Available for on-location / store shoots",
      });
      if (creator.onLocationFee) {
        const fee = Number.parseFloat(creator.onLocationFee);
        const feeLabel = Number.isFinite(fee)
          ? fee.toLocaleString("en-IN")
          : creator.onLocationFee;
        rows.push({
          ok: true,
          text: `On-location fee: ₹${feeLabel}`,
        });
      }
    }

    if (rows.length === 0) {
      rows.push({
        ok: true,
        text: "Open to brand collaborations",
      });
    }

    return rows;
  }, [
    creator.travelRadiusKm,
    creator.storeVisit,
    creator.onLocationFee,
  ]);

  const showReviewsLine = creator.reviewCount > 0;

  return (
    <div className="rounded-2xl border border-border bg-card p-6 sm:p-8">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
        <div
          className="relative flex size-24 shrink-0 overflow-hidden rounded-full bg-muted sm:size-28"
          role="img"
          aria-label={creator.name}
        >
          {isRemoteImage(creator.thumbnail) ? (
            <Image
              src={creator.thumbnail}
              alt={creator.name}
              fill
              className="object-cover"
              sizes="112px"
            />
          ) : (
            <span className="flex size-full items-center justify-center text-3xl font-bold text-foreground">
              {initials}
            </span>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              {creator.name}
            </h1>
            {creator.available && (
              <Badge className="border-emerald-500/20 bg-emerald-500/10 text-emerald-600">
                Available
              </Badge>
            )}
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <MapPin className="size-3.5 shrink-0" />
              {creator.location}
            </span>
            {showReviewsLine ? (
              <span className="flex items-center gap-1">
                <Star className="size-3.5 shrink-0 fill-amber-400 text-amber-400" />
                <span className="font-medium text-foreground">
                  {creator.rating}
                </span>
                <span>({creator.reviewCount} reviews)</span>
              </span>
            ) : (
              <span className="text-xs text-muted-foreground">
                No reviews yet
              </span>
            )}
          </div>

          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            {creator.bio}
          </p>

          <div className="mt-4 space-y-2.5">
            {creator.languages.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {creator.languages.map((l) => (
                  <Badge key={l} variant="secondary" className="text-xs">
                    {l}
                  </Badge>
                ))}
              </div>
            ) : null}

            {creator.personaTags.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {creator.personaTags.map((t) => (
                  <Badge key={t} variant="secondary" className="text-xs">
                    {t}
                  </Badge>
                ))}
              </div>
            ) : null}

            {creator.categories.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {creator.categories.map((c) => (
                  <Badge key={c} variant="secondary" className="text-xs">
                    {c}
                  </Badge>
                ))}
              </div>
            ) : null}

            {creator.restrictions.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {creator.restrictions.map((r) => (
                  <Badge
                    key={r}
                    variant="outline"
                    className="text-xs text-muted-foreground"
                  >
                    {r}
                  </Badge>
                ))}
              </div>
            ) : null}
          </div>

          <div className="mt-4 flex flex-wrap gap-x-5 gap-y-1.5">
            {attributeRows.map(({ ok, text }) => (
              <span
                key={text}
                className={`flex items-center gap-1.5 text-xs ${
                  ok ? "text-foreground" : "text-muted-foreground"
                }`}
              >
                {ok ? (
                  <CheckCircle2 className="size-3.5 shrink-0 text-emerald-500" />
                ) : null}
                {text}
              </span>
            ))}
          </div>

          <div className="mt-5">
            <Button size="sm" variant="outline" className="gap-1.5">
              <MessageSquare className="size-3.5" />
              Contact Creator
            </Button>
          </div>
        </div>

        <div className="hidden shrink-0 grid-cols-2 gap-3 sm:grid">
          <StatBlock label="Orders" value={String(creator.ordersCompleted)} />
          <StatBlock label="Rating" value={String(creator.rating)} />
          <StatBlock label="Reviews" value={String(creator.reviewCount)} />
          <StatBlock
            label="Starting"
            value={`₹${creator.startingPrice.toLocaleString("en-IN")}`}
          />
        </div>
      </div>
    </div>
  );
});

function StatBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-muted/40 px-4 py-3 text-center">
      <p className="text-lg font-bold">{value}</p>
      <p className="text-xs uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
    </div>
  );
}
