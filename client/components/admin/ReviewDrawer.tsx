import React from "react";
import Image from "next/image";
import Link from "next/link";
import type { AdminCreatorListItemDto } from "@/features/admin/types";
import { formatInrPrice } from "@/features/admin/constants/admin-creator-tabs";
import { useApproveCreatorMutation } from "@/features/admin/hooks/use-approve-creator-mutation";
import { useRejectCreatorMutation } from "@/features/admin/hooks/use-reject-creator-mutation";
import { useSendCreatorForReviewMutation } from "@/features/admin/hooks/use-send-creator-for-review-mutation";
import { useAdminPortfolioVideosQuery } from "@/features/creator-portfolio/hooks/use-admin-portfolio-videos-query";
import { useCreatorProfileQuery } from "@/features/creators/hooks/use-creator-profile-query";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { usePublicInstagramInsightsQuery } from "@/features/creators/hooks/use-public-instagram-insights";
import {
  refreshCreatorInstagramInsights,
  publicInstagramInsightsQueryKey,
} from "@/features/creators/api/instagram-insights";
import {
  InstagramInsights,
  hasInstagramInsightsData,
} from "@/features/creators/components/instagram-insights/instagram-insights";
import type { PortfolioVideoApi } from "@/features/creator-portfolio/api/types";
import type { CreatorProfileItemApi } from "@/features/creators/api/types";
import { Drawer, DrawerContent, DrawerTitle } from "@/components/ui/drawer";
import { Spinner } from "@/components/ui/spinner";
import { Instagram, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { RejectDialog } from "./RejectDialog";

function RefreshInsightsButton({ profileId }: { profileId: string }) {
  const queryClient = useQueryClient();
  const refresh = useMutation({
    mutationFn: () => refreshCreatorInstagramInsights(profileId),
    onSuccess: (fresh) => {
      queryClient.setQueryData(
        publicInstagramInsightsQueryKey(profileId),
        fresh,
      );
    },
  });

  return (
    <button
      type="button"
      onClick={() => refresh.mutate()}
      disabled={refresh.isPending}
      className="inline-flex items-center gap-1.5 rounded-lg border border-border/50 px-3 py-1.5 text-xs font-semibold text-foreground transition-colors hover:bg-muted disabled:opacity-60"
    >
      <RefreshCw
        className={cn("h-3.5 w-3.5", refresh.isPending && "animate-spin")}
      />
      {refresh.isPending ? "Refreshing…" : "Refresh insights"}
    </button>
  );
}

function InstagramReviewPanel({ profileId }: { profileId: string }) {
  const { data, isLoading } = usePublicInstagramInsightsQuery(profileId, {
    enabled: Boolean(profileId),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        <Spinner />
      </div>
    );
  }

  if (!data || !data.connected) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border/50 bg-card/30 py-16 text-center text-muted-foreground">
        <Instagram className="h-6 w-6 opacity-50" />
        <p className="text-sm font-medium text-foreground">
          Instagram not connected
        </p>
        <p className="max-w-xs text-xs">
          This creator hasn&rsquo;t connected an Instagram account yet.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 rounded-2xl border border-border/40 bg-card/40 p-4">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-tr from-amber-500 via-pink-500 to-purple-600 text-white">
          <Instagram className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            Connected account
          </p>
          <p className="truncate text-sm font-semibold text-foreground">
            {data.username ? `@${data.username}` : "Instagram account"}
          </p>
        </div>
        <RefreshInsightsButton profileId={profileId} />
      </div>

      {hasInstagramInsightsData(data) ? (
        <div className="rounded-2xl border border-border/40 bg-card/40 p-5">
          <InstagramInsights insights={data} variant="full" />
        </div>
      ) : (
        <p className="rounded-2xl border border-dashed border-border/50 bg-card/20 p-4 text-center text-xs text-muted-foreground">
          Audience metrics haven&rsquo;t synced yet for this account.
        </p>
      )}
    </div>
  );
}

const FACET_LABELS: Record<string, string> = {
  CONTENT_CATEGORY: "Creator's category",
  CREATOR_TYPE: "Creator type",
  OCCUPATION: "Occupation",
  APPEARANCE: "Appearance",
  LANGUAGE: "Languages",
};

function formatLocation(
  city?: string | null,
  stateName?: string | null,
  countryName?: string | null,
): string {
  const parts = [city, stateName, countryName].filter(Boolean);
  return parts.length > 0 ? parts.join(", ") : "Not provided";
}

function formatSubmittedAt(iso?: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

function formatGender(gender?: string | null): string {
  if (!gender) return "—";
  return gender.replace(/_/g, " ");
}

function ReviewSection({
  title,
  description,
  action,
  children,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-border/40 bg-card/40">
      <div className="flex items-start justify-between gap-3 border-b border-border/30 px-5 py-3.5">
        <div className="min-w-0">
          <h3 className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
            {title}
          </h3>
          {description ? (
            <p className="mt-0.5 text-xs text-muted-foreground/80">{description}</p>
          ) : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      <div className="px-5 py-4">{children}</div>
    </section>
  );
}

function DetailField({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <dt className="mb-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
        {label}
      </dt>
      <dd className="text-sm font-medium break-words text-foreground">{children}</dd>
    </div>
  );
}

function ExternalLink({ href, label }: { href: string; label?: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-primary hover:underline break-all"
    >
      {label ?? href}
    </a>
  );
}

function PortfolioGrid({
  videos,
}: {
  videos: Array<{
    id: string;
    videoUrl: string;
    thumbnailUrl?: string | null;
    industryLabel?: string | null;
    tags?: string[];
  }>;
}) {
  if (videos.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border/40 py-8 text-center">
        <p className="text-sm font-medium text-muted-foreground">
          No portfolio videos uploaded.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      {videos.map((video, idx) => {
        const hasVideo = Boolean(video.videoUrl?.trim());

        return (
          <div key={video.id} className="space-y-2">
            <div className="relative aspect-4/5 overflow-hidden rounded-xl border border-border/20 bg-card">
              {hasVideo ? (
                <video
                  src={video.videoUrl}
                  className="h-full w-full object-cover"
                  controls
                  muted
                  playsInline
                  preload="metadata"
                  poster={video.thumbnailUrl || undefined}
                />
              ) : video.thumbnailUrl ? (
                <Image
                  alt={`Portfolio ${idx + 1}`}
                  fill
                  className="object-cover"
                  src={video.thumbnailUrl}
                  unoptimized
                />
              ) : null}
            </div>
            {video.industryLabel ? (
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                {video.industryLabel}
              </p>
            ) : null}
            {video.tags && video.tags.length > 0 ? (
              <div className="flex flex-wrap gap-1">
                {video.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-md border border-border/30 px-1.5 py-0.5 text-[10px] text-muted-foreground"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

function ReviewProfileSections({
  profile,
  listItem,
  portfolioVideos,
}: {
  profile: CreatorProfileItemApi;
  listItem: AdminCreatorListItemDto;
  portfolioVideos: PortfolioVideoApi[];
}) {
  const facetsByDimension = (profile.facetSelections ?? []).reduce<
    Record<string, Array<{ label: string; slug: string }>>
  >((acc, facet) => {
    const key = facet.dimension;
    if (!acc[key]) acc[key] = [];
    acc[key].push({ label: facet.label, slug: facet.slug });
    return acc;
  }, {});

  const publicPortfolio = portfolioVideos.filter(
    (video) => video.visibilityStatus === "public",
  );

  const [activeTab, setActiveTab] = React.useState<"profile" | "instagram">(
    "profile",
  );

  React.useEffect(() => {
    setActiveTab("profile");
  }, [profile.id]);

  const { data: igPreview } = usePublicInstagramInsightsQuery(profile.id, {
    enabled: Boolean(profile.id),
  });

  const tabClass = (tab: "profile" | "instagram") =>
    cn(
      "flex items-center gap-1.5 border-b-2 px-1 pb-2.5 text-sm font-semibold transition-colors",
      activeTab === tab
        ? "border-primary text-primary"
        : "border-transparent text-muted-foreground hover:text-foreground",
    );

  return (
    <div className="space-y-6 pb-4">
      <div className="flex items-center gap-6 border-b border-border/40">
        <button
          type="button"
          onClick={() => setActiveTab("profile")}
          className={tabClass("profile")}
        >
          Profile
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("instagram")}
          className={tabClass("instagram")}
        >
          <Instagram className="h-4 w-4" />
          Instagram
          {igPreview?.connected ? (
            <span className="rounded-full bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-700">
              Live
            </span>
          ) : null}
        </button>
      </div>

      {activeTab === "instagram" ? (
        <InstagramReviewPanel profileId={profile.id} />
      ) : (
        <div className="space-y-5">
          {/* Identity hero */}
          <section className="rounded-2xl border border-border/40 bg-gradient-to-br from-muted/40 to-card/30 p-5">
            <div className="flex items-start gap-5">
              <div className="relative flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-primary/10 ring-2 ring-primary/15">
                {profile.profileImageUrl ? (
                  <Image
                    src={profile.profileImageUrl}
                    alt={profile.displayName}
                    fill
                    className="object-cover"
                    sizes="96px"
                  />
                ) : (
                  <span className="font-headline text-3xl font-extrabold text-primary">
                    {profile.displayName.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              <div className="min-w-0 flex-1 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="font-headline text-2xl font-extrabold tracking-tight">
                    {profile.displayName}
                  </h1>
                  {profile.completeProfile ? (
                    <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                      Profile complete
                    </span>
                  ) : (
                    <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-700">
                      Incomplete
                    </span>
                  )}
                </div>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {profile.bio || "No bio provided."}
                </p>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-1 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <span className="material-symbols-outlined text-base">
                      location_on
                    </span>
                    {formatLocation(
                      profile.city,
                      profile.stateName,
                      profile.countryName,
                    )}
                  </span>
                  <span className="hidden text-border sm:inline">·</span>
                  <span>
                    Submitted{" "}
                    {formatSubmittedAt(
                      listItem.submittedAt ?? profile.createdAt,
                    )}
                  </span>
                </div>
              </div>
            </div>
          </section>

          {/* Instagram jump card */}
          <button
            type="button"
            onClick={() => setActiveTab("instagram")}
            className="group flex w-full items-center gap-4 rounded-2xl border border-border/40 bg-card/40 px-5 py-4 text-left transition-colors hover:border-pink-500/40 hover:bg-pink-500/5"
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-amber-500 via-pink-500 to-purple-600 text-white shadow-sm">
              <Instagram className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-foreground">
                Check Instagram
              </p>
              <p className="text-xs text-muted-foreground">
                {igPreview?.connected
                  ? `Connected as @${igPreview.username ?? "account"} — view audience metrics`
                  : "See connection status and audience insights"}
              </p>
            </div>
            <span className="text-xs font-semibold text-primary group-hover:underline">
              Open tab →
            </span>
          </button>

          {profile.introVideoUrl ? (
            <ReviewSection title="Intro video">
              <div className="overflow-hidden rounded-xl border border-border/20 bg-black">
                <video
                  src={profile.introVideoUrl}
                  className="aspect-video w-full object-contain"
                  controls
                  playsInline
                  poster={profile.profileImageUrl || undefined}
                />
              </div>
            </ReviewSection>
          ) : null}

          <ReviewSection title="Contact & identity">
            <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <DetailField label="Email">
                {profile.contactEmail || "—"}
              </DetailField>
              <DetailField label="Phone">
                {profile.phone || "—"}
                {profile.phoneVerified ? (
                  <span className="ml-2 text-[10px] font-bold uppercase text-primary">
                    Verified
                  </span>
                ) : null}
              </DetailField>
              <DetailField label="Date of birth">
                {profile.dateOfBirth
                  ? `${profile.dateOfBirth}${profile.age != null ? ` (${profile.age} yrs)` : ""}`
                  : profile.age != null
                    ? `${profile.age} years`
                    : "—"}
              </DetailField>
              <DetailField label="Gender">
                {formatGender(profile.gender)}
              </DetailField>
              <DetailField label="Shipping address" className="sm:col-span-2">
                {profile.shippingAddress || "—"}
              </DetailField>
            </dl>
          </ReviewSection>

          <ReviewSection
            title="Social & links"
            action={
              <button
                type="button"
                onClick={() => setActiveTab("instagram")}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border/50 px-2.5 py-1 text-[11px] font-semibold text-foreground transition-colors hover:bg-muted"
              >
                <Instagram className="h-3.5 w-3.5" />
                Check Instagram
              </button>
            }
          >
            <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <DetailField label="Instagram URL">
                {profile.instagramUrl ? (
                  <ExternalLink href={profile.instagramUrl} />
                ) : (
                  "—"
                )}
              </DetailField>
              <DetailField label="YouTube">
                {profile.youtubeUrl ? (
                  <ExternalLink href={profile.youtubeUrl} />
                ) : (
                  "—"
                )}
              </DetailField>
              <DetailField label="Snapchat">
                {profile.snapchatUrl ? (
                  <ExternalLink href={profile.snapchatUrl} />
                ) : (
                  "—"
                )}
              </DetailField>
              {listItem.driveLink ? (
                <DetailField label="Google Drive" className="sm:col-span-2">
                  <ExternalLink
                    href={listItem.driveLink}
                    label="Open Drive folder"
                  />
                </DetailField>
              ) : null}
            </dl>
          </ReviewSection>

          {(profile.profileLanguages?.length ?? 0) > 0 ? (
            <ReviewSection title="Languages">
              <div className="flex flex-wrap gap-2">
                {profile.profileLanguages?.map((lang) => (
                  <span
                    key={lang.slug}
                    className="rounded-md border border-border/30 bg-background/60 px-2.5 py-1 text-xs font-medium"
                  >
                    {lang.label}
                  </span>
                ))}
              </div>
            </ReviewSection>
          ) : null}

          {Object.keys(facetsByDimension).length > 0 ? (
            <ReviewSection title="Profile facets">
              <div className="space-y-4">
                {Object.entries(facetsByDimension).map(([dimension, facets]) => (
                  <div key={dimension}>
                    <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                      {FACET_LABELS[dimension] ?? dimension.replace(/_/g, " ")}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {facets.map((facet) => (
                        <span
                          key={facet.slug}
                          className="rounded-md border border-primary/20 bg-primary/10 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-primary"
                        >
                          {facet.label}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </ReviewSection>
          ) : null}

          {(profile.packages?.length ?? 0) > 0 ? (
            <ReviewSection title={`Packages (${profile.packages.length})`}>
              <div className="space-y-3">
                {profile.packages.map((pkg) => (
                  <div
                    key={pkg.id}
                    className="rounded-xl border border-border/30 bg-background/50 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <p className="font-headline text-base font-bold">
                        {pkg.name}
                      </p>
                      <p className="shrink-0 text-sm font-bold text-primary">
                        {formatInrPrice(pkg.priceAmount)}
                      </p>
                    </div>
                    <dl className="mt-3 grid grid-cols-2 gap-3 text-xs text-muted-foreground sm:grid-cols-3">
                      <div>
                        <dt className="font-bold uppercase tracking-wider">
                          Delivery
                        </dt>
                        <dd className="mt-0.5 text-foreground">
                          {pkg.deliveryDays} days
                        </dd>
                      </div>
                      <div>
                        <dt className="font-bold uppercase tracking-wider">
                          Video length
                        </dt>
                        <dd className="mt-0.5 text-foreground">
                          {pkg.videoLengthSeconds}s
                        </dd>
                      </div>
                      <div>
                        <dt className="font-bold uppercase tracking-wider">
                          Revisions
                        </dt>
                        <dd className="mt-0.5 text-foreground">
                          {pkg.maxRevisions}
                        </dd>
                      </div>
                    </dl>
                    {pkg.deliverables.length > 0 ? (
                      <ul className="mt-3 list-inside list-disc text-sm text-muted-foreground">
                        {pkg.deliverables.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                ))}
              </div>
            </ReviewSection>
          ) : null}

          {(profile.addOns?.length ?? 0) > 0 ? (
            <ReviewSection title={`Add-ons (${profile.addOns?.length})`}>
              <div className="space-y-2">
                {profile.addOns?.map((addOn) => (
                  <div
                    key={addOn.id}
                    className="flex items-start justify-between gap-3 rounded-xl border border-border/30 bg-background/50 px-4 py-3"
                  >
                    <div>
                      <p className="text-sm font-semibold">{addOn.name}</p>
                    </div>
                    <p className="shrink-0 text-sm font-bold">
                      {formatInrPrice(addOn.priceAmount)}
                    </p>
                  </div>
                ))}
              </div>
            </ReviewSection>
          ) : null}

          {(profile.restrictions?.length ?? 0) > 0 ? (
            <ReviewSection title="Restrictions">
              <div className="flex flex-wrap gap-2">
                {profile.restrictions?.map((item) => (
                  <span
                    key={item.id}
                    className="rounded-md border border-destructive/20 bg-destructive/5 px-2.5 py-1 text-xs text-destructive"
                  >
                    {item.restriction}
                  </span>
                ))}
              </div>
            </ReviewSection>
          ) : null}

          <ReviewSection title="Work preferences">
            <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <DetailField label="On-location available">
                {profile.onLocationAvailable ? "Yes" : "No"}
              </DetailField>
              <DetailField label="Travel radius">
                {profile.travelRadius != null
                  ? `${profile.travelRadius} km`
                  : "—"}
              </DetailField>
              <DetailField label="Collaborations completed">
                {profile.collaborationCount ?? 0}
              </DetailField>
              <DetailField label="Content volume">
                {profile.contentVolume
                  ? profile.contentVolume.replace(/_/g, " ")
                  : "—"}
              </DetailField>
            </dl>
          </ReviewSection>

          <ReviewSection
            title="Portfolio"
            description={`${publicPortfolio.length} public video${publicPortfolio.length === 1 ? "" : "s"}`}
          >
            <PortfolioGrid videos={publicPortfolio} />
          </ReviewSection>

          <div className="pt-1">
            <Link
              href={`/admin/creators/${profile.id}`}
              className="text-sm font-medium text-primary hover:underline"
            >
              Open full profile editor →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ReviewDrawer({
  isOpen,
  onClose,
  creator,
}: {
  isOpen: boolean;
  onClose: () => void;
  creator?: AdminCreatorListItemDto | null;
}) {
  const { mutate: approve, isPending: isApproving } =
    useApproveCreatorMutation();
  const { mutate: reject, isPending: isRejecting } = useRejectCreatorMutation();
  const { mutate: sendForReview, isPending: isSendingForReview } =
    useSendCreatorForReviewMutation();

  const [isRejectOpen, setIsRejectOpen] = React.useState(false);

  // A self completed profile has to be sent for review before it can be
  // approved, so the primary action becomes "Send for review" instead.
  const isSelfCompleted = creator?.approvalStatus === "SELF_COMPLETED";

  const creatorId = creator?.id ?? "";
  const drawerOpen = isOpen && !!creator;

  const {
    data: profile,
    isLoading: profileLoading,
    isError: profileError,
  } = useCreatorProfileQuery(creatorId, {
    enabled: drawerOpen,
  });

  const { data: portfolioVideos = [], isLoading: portfolioLoading } =
    useAdminPortfolioVideosQuery({
      creatorId,
      enabled: drawerOpen,
    });

  const handleApprove = () => {
    if (!creator) return;
    approve(creator.id, {
      onSuccess: () => {
        onClose();
      },
    });
  };

  const handleSendForReview = () => {
    if (!creator) return;
    sendForReview(creator.id, {
      onSuccess: () => {
        onClose();
      },
    });
  };

  const handleRejectClick = () => {
    setIsRejectOpen(true);
  };

  const handleConfirmReject = (reason: string) => {
    if (!creator) return;
    setIsRejectOpen(false);
    reject(
      { id: creator.id, rejectionReason: reason },
      {
        onSuccess: () => onClose(),
      },
    );
  };

  const isWorking = isApproving || isRejecting || isSendingForReview;
  const isLoading = profileLoading || portfolioLoading;

  return (
    <>
      <Drawer
        open={drawerOpen}
        onOpenChange={(open) => {
          if (!open) onClose();
        }}
        direction="right"
      >
        <DrawerContent className="data-[vaul-drawer-direction=right]:w-full data-[vaul-drawer-direction=right]:max-w-full md:data-[vaul-drawer-direction=right]:max-w-[500px] lg:data-[vaul-drawer-direction=right]:max-w-[680px] h-full data-[vaul-drawer-direction=right]:rounded-none border-l border-border/30 bg-background shadow-[-20px_0_50px_rgba(0,0,0,0.5)] overflow-y-auto overflow-x-hidden flex flex-col [&::-webkit-scrollbar]:hidden [scrollbar-width:none]">
          {creator && (
            <>
              <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border/20 bg-background px-8 py-6">
                <DrawerTitle className="text-xl font-headline font-bold">
                  Review Creator
                </DrawerTitle>
                <button
                  className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-50"
                  onClick={onClose}
                  disabled={isWorking}
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              <div className="flex-1 p-8">
                {isLoading ? (
                  <div className="flex min-h-[40vh] items-center justify-center">
                    <Spinner className="size-8 text-muted-foreground" />
                  </div>
                ) : profileError || !profile ? (
                  <div className="rounded-xl border border-border/20 bg-card/20 px-4 py-8 text-center text-sm text-muted-foreground">
                    Could not load the full creator profile. Try again or open
                    the profile editor.
                  </div>
                ) : (
                  <ReviewProfileSections
                    profile={profile}
                    listItem={creator}
                    portfolioVideos={portfolioVideos}
                  />
                )}
              </div>

              <div className="sticky bottom-0 flex space-x-4 border-t border-border/20 bg-background/95 p-8 backdrop-blur-md">
                <button
                  className="flex flex-1 items-center justify-center space-x-2 rounded-xl border border-border py-2 text-sm font-bold uppercase tracking-wider text-muted-foreground transition-all hover:border-error/30 hover:bg-error/10 hover:text-error disabled:opacity-50"
                  onClick={handleRejectClick}
                  disabled={isWorking}
                >
                  {isRejecting && (
                    <span className="material-symbols-outlined animate-spin text-[18px]">
                      progress_activity
                    </span>
                  )}
                  <span>{isRejecting ? "Rejecting..." : "Reject"}</span>
                </button>
                <button
                  className="flex w-full flex-2 items-center justify-center space-x-2 rounded-xl bg-primary py-2 text-sm font-bold uppercase tracking-wider text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:brightness-110 disabled:opacity-50"
                  onClick={isSelfCompleted ? handleSendForReview : handleApprove}
                  disabled={isWorking || isLoading}
                >
                  {(isApproving || isSendingForReview) && (
                    <span className="material-symbols-outlined animate-spin text-[18px]">
                      progress_activity
                    </span>
                  )}
                  <span>
                    {isSelfCompleted
                      ? isSendingForReview
                        ? "Sending..."
                        : "Send for Review"
                      : isApproving
                        ? "Approving..."
                        : "Approve Creator"}
                  </span>
                </button>
              </div>
            </>
          )}
        </DrawerContent>
      </Drawer>

      <RejectDialog
        isOpen={isRejectOpen}
        onClose={() => setIsRejectOpen(false)}
        onConfirm={handleConfirmReject}
        isWorking={isWorking}
      />
    </>
  );
}
