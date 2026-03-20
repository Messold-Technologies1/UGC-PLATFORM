import { MapPin, Star, Clock, Calendar, CheckCircle2, XCircle, MessageSquare } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { CreatorProfile } from "../types";

interface ProfileHeaderProps {
  creator: CreatorProfile;
}

export function ProfileHeader({ creator }: ProfileHeaderProps) {
  const attributes: { ok: boolean; text: string }[] = [
    { ok: creator.storeVisit, text: creator.storeVisit ? "Accepts store visits" : "No store visits" },
    { ok: true, text: `Speaks ${creator.languages.join(", ")}` },
    { ok: !creator.acceptsLingerie, text: creator.acceptsLingerie ? "Accepts lingerie" : "Does not accept lingerie" },
  ];

  return (
    <div className="rounded-2xl border border-border bg-card p-6 sm:p-8">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
        <div
          className="flex size-24 shrink-0 items-center justify-center rounded-full bg-muted text-3xl font-bold text-foreground sm:size-28"
          role="img"
          aria-label={creator.name}
        >
          {creator.name.split(" ").map((n) => n[0]).join("")}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{creator.name}</h1>
            {creator.available && (
              <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                Available
              </Badge>
            )}
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <MapPin className="size-3.5" />
              {creator.location}
            </span>
            <span className="flex items-center gap-1">
              <Star className="size-3.5 fill-amber-400 text-amber-400" />
              <span className="font-medium text-foreground">{creator.rating}</span>
              <span>({creator.reviewCount} reviews)</span>
            </span>
            <span className="flex items-center gap-1">
              <Clock className="size-3.5" />
              Responds {creator.responseTime}
            </span>
            <span className="flex items-center gap-1">
              <Calendar className="size-3.5" />
              Member since {creator.joinedDate}
            </span>
          </div>

          <p className="mt-3 max-w-2xl text-sm text-muted-foreground leading-relaxed">
            {creator.bio}
          </p>

          <div className="mt-3 flex flex-wrap gap-1.5">
            {creator.tags.map((tag) => (
              <Badge key={tag} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>

          <div className="mt-4 flex flex-wrap gap-x-5 gap-y-1.5">
            {attributes.map(({ ok, text }) => (
              <span
                key={text}
                className={`flex items-center gap-1.5 text-xs ${
                  ok ? "text-foreground" : "text-muted-foreground"
                }`}
              >
                {ok ? (
                  <CheckCircle2 className="size-3.5 text-emerald-500" />
                ) : (
                  <XCircle className="size-3.5 text-muted-foreground/60" />
                )}
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
          <StatBlock label="Starting" value={`₹${creator.startingPrice.toLocaleString("en-IN")}`} />
        </div>
      </div>
    </div>
  );
}

function StatBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-muted/40 px-4 py-3 text-center">
      <p className="text-lg font-bold">{value}</p>
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
    </div>
  );
}
