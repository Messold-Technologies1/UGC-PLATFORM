import { memo } from "react";
import {
  MapPin,
  Check,
  X,
  User,
  Globe,
  Palette,
  Building2,
  Bot,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { CreatorProfile } from "../types";

interface InfoCardsSectionProps {
  creator: CreatorProfile;
}

function AboutCard({ creator }: { creator: CreatorProfile }) {
  const firstName = creator.name.split(" ")[0];
  return (
    <div className="rounded-xl border border-border bg-card p-5 flex flex-col gap-4 min-w-0">
      <div className="flex items-center gap-2">
        <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10">
          <User className="size-4 text-primary" />
        </div>
        <h3 className="text-sm font-bold text-foreground">About {firstName}</h3>
      </div>

      <p className="text-xs text-muted-foreground leading-relaxed line-clamp-4">
        {creator.bio}
      </p>

      <div className="space-y-2 text-xs">
        <div className="flex gap-2">
          <span className="text-muted-foreground w-28 shrink-0">Location</span>
          <span className="font-medium text-foreground">
            {creator.location}
          </span>
        </div>
        <div className="flex gap-2">
          <span className="text-muted-foreground w-28 shrink-0">Age</span>
          <span className="font-medium text-foreground">25</span>
        </div>
        <div className="flex gap-2">
          <span className="text-muted-foreground w-28 shrink-0">Gender</span>
          <span className="font-medium text-foreground capitalize">
            {creator.gender}
          </span>
        </div>
      </div>

      <div>
        <p className="text-xs text-muted-foreground mb-1.5">
          Content Categories
        </p>
        <div className="flex flex-wrap gap-1.5">
          {creator.categories.map((cat) => (
            <Badge
              key={cat}
              variant="outline"
              className="text-[10px] rounded-full px-2.5 py-0.5 font-medium border-primary/30 text-primary"
            >
              {cat}
            </Badge>
          ))}
        </div>
      </div>
    </div>
  );
}

function LanguagesCard({ profileLanguages }: { profileLanguages: { label: string; fluency: string }[] }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 flex flex-col gap-4 min-w-0">
      <div className="flex items-center gap-2">
        <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10">
          <Globe className="size-4 text-primary" />
        </div>
        <h3 className="text-sm font-bold text-foreground">Languages</h3>
      </div>

      {profileLanguages.length > 0 ? (
        <div className="space-y-2.5">
          {profileLanguages.map((lang) => (
            <div key={lang.label} className="flex items-center gap-2 text-sm">
              <Check className="size-4 text-primary shrink-0" />
              <span className="text-foreground">
                {lang.label}
                <span className="text-muted-foreground ml-1.5 capitalize text-xs">
                  • {lang.fluency.toLowerCase()}
                </span>
              </span>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground italic">None specified</p>
      )}
    </div>
  );
}

function ContentStylesCard({ creator }: { creator: CreatorProfile }) {
  const styles = creator.facetSelections
    .filter((f) => f.dimension === "CONTENT_STYLE")
    .map((f) => f.label);

  return (
    <div className="rounded-xl border border-border bg-card p-5 flex flex-col gap-4 min-w-0">
      <div className="flex items-center gap-2">
        <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10">
          <Palette className="size-4 text-primary" />
        </div>
        <h3 className="text-sm font-bold text-foreground">Content Styles</h3>
      </div>

      {styles.length > 0 ? (
        <div className="space-y-2.5">
          {styles.map((style) => (
            <div key={style} className="flex items-center gap-2 text-sm">
              <Check className="size-4 text-primary shrink-0" />
              <span className="text-foreground">{style}</span>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground italic">None specified</p>
      )}
    </div>
  );
}

function WorkedWithCard({ creator }: { creator: CreatorProfile }) {
  const brands = creator.facetSelections
    .filter((f) => f.dimension === "CATEGORY_EXPERIENCE")
    .map((f) => f.label);

  return (
    <div className="rounded-xl border border-border bg-card p-5 flex flex-col gap-4 min-w-0">
      <div className="flex items-center gap-2">
        <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10">
          <Building2 className="size-4 text-primary" />
        </div>
        <h3 className="text-sm font-bold text-foreground">Worked With</h3>
      </div>

      {brands.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {brands.map((brand) => (
            <Badge
              key={brand}
              variant="outline"
              className="text-xs rounded-full px-3 py-1 font-medium"
            >
              {brand}
            </Badge>
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground italic">None specified</p>
      )}
    </div>
  );
}

function AiPermissionsCard({ creator }: { creator: CreatorProfile }) {
  const perms = creator.facetSelections
    .filter((f) => f.dimension === "AI_CONTENT_PERMISSION")
    .map((f) => f.label);

  return (
    <div className="rounded-xl border border-border bg-card p-5 flex flex-col gap-4 min-w-0">
      <div className="flex items-center gap-2">
        <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10">
          <Bot className="size-4 text-primary" />
        </div>
        <h3 className="text-sm font-bold text-foreground">
          AI Content Permissions
        </h3>
      </div>

      {perms.length > 0 ? (
        <div className="space-y-2.5">
          {perms.map((label) => (
            <div key={label} className="flex items-center gap-2 text-sm">
              <Check className="size-4 text-primary shrink-0" />
              <span className="text-foreground">{label}</span>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground italic">None specified</p>
      )}
    </div>
  );
}

export const InfoCardsSection = memo(function InfoCardsSection({
  creator,
}: InfoCardsSectionProps) {
  return (
    <section className="mt-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <AboutCard creator={creator} />
        <LanguagesCard profileLanguages={creator.profileLanguages} />
        <ContentStylesCard creator={creator} />
        <WorkedWithCard creator={creator} />
        <AiPermissionsCard creator={creator} />
      </div>
    </section>
  );
});
