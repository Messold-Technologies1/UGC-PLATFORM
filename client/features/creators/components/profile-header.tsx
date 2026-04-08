import { memo, useMemo } from "react";
import Image from "next/image";
import {
  MapPin,
  CheckCircle2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
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

  return (
    <div className="rounded-3xl border-0 bg-card p-5 sm:p-6 lg:p-7 shadow-sm">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-stretch lg:gap-8">
        <div className="relative shrink-0 flex flex-col w-full sm:w-56 lg:w-64 items-center">
          <div
            className="relative flex flex-1 min-h-[240px] lg:min-h-[260px] w-full overflow-hidden rounded-2xl bg-muted"
            role="img"
            aria-label={creator.name}
          >
            {isRemoteImage(creator.thumbnail) ? (
              <Image
                src={creator.thumbnail}
                alt={creator.name}
                fill
                className="object-cover"
                sizes="(max-width: 640px) 100vw, 250px"
              />
            ) : (
              <span className="flex size-full items-center justify-center text-4xl font-bold text-foreground">
                {initials}
              </span>
            )}
          </div>
          {/* {creator.available && (
             <div className="absolute -bottom-3 z-10 rounded-full bg-card text-foreground px-3 py-1 text-[10px] font-bold uppercase tracking-wider shadow-sm border border-border flex items-center gap-1.5 whitespace-nowrap">
               <div className="size-1.5 rounded-full bg-emerald-500" /> AVAILABLE
             </div>
          )} */}
        </div>

        <div className="min-w-0 flex-1 flex flex-col lg:flex-row lg:items-center gap-6 lg:gap-10">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
                {creator.name}
              </h1>
              <div className="flex size-6 items-center justify-center rounded-full bg-blue-500 text-white">
                <CheckCircle2 className="size-4" strokeWidth={3} />
              </div>
            </div>

            <div className="mt-2 flex items-center gap-1.5 text-sm text-muted-foreground">
              <MapPin className="size-4 shrink-0" />
              {creator.location}
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-6 sm:gap-10">
              <div className="flex flex-col gap-1">
                 <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Gender</span>
                 <span className="text-lg font-bold capitalize">{creator.gender}</span>
              </div>
              <div className="flex flex-col gap-1">
                 <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Travel</span>
                 <span className="text-[15px] font-bold">
                   {creator.travelRadiusKm && creator.travelRadiusKm > 0 
                     ? `Up to ${creator.travelRadiusKm} km` 
                     : "Not available"}
                 </span>
              </div>
              <div className="flex flex-col gap-1">
                 <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">On-Location</span>
                 <div className="flex items-center gap-1.5 h-[28px]">
                   {creator.storeVisit ? (
                     <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-500 border-emerald-500/20">Yes</Badge>
                   ) : (
                     <span className="text-lg font-bold">No</span>
                   )}
                 </div>
              </div>
              <div className="flex flex-col gap-1">
                 <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Starting From</span>
                 <span className="text-xl font-bold text-primary">₹{creator.startingPrice.toLocaleString("en-IN")}</span>
              </div>
            </div>

            <div className="mt-6">
              <div className="flex flex-wrap gap-2">
                {[...creator.languages, ...creator.categories].map((tag) => (
                  <Badge key={tag} className="bg-primary/10 text-primary hover:bg-primary/20 border-0 rounded-full px-4 py-0.5 text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          </div>

          <div className="hidden lg:flex w-72 shrink-0 flex-col justify-center gap-5 border-l border-border/50 pl-8 xl:w-80 overflow-hidden">
             {creator.bio ? (
               <div>
                 <h3 className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground mb-1.5">About</h3>
                 <p className="text-[13px] text-foreground/80 leading-relaxed line-clamp-3">{creator.bio}</p>
               </div>
             ) : null}
             
             {creator.personaTags && creator.personaTags.length > 0 ? (
               <div>
                  <h3 className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground mb-2">Vibe & Persona</h3>
                  <div className="flex flex-wrap gap-1.5">
                    {creator.personaTags.slice(0, 5).map((tag) => (
                      <Badge key={tag} variant="outline" className="border-border/80 px-2 py-0.5 text-[10px] text-muted-foreground font-medium bg-muted/20">
                        {tag}
                      </Badge>
                    ))}
                  </div>
               </div>
             ) : null}
          </div>
        </div>
      </div>
    </div>
  );
});
