"use client";

import { useState, Fragment } from "react";
import { AnimatePresence, motion, type Variants } from "framer-motion";
import {
  Building2,
  Calendar,
  CheckCircle,
  ClipboardList,
  ExternalLink,
  Globe,
  Instagram,
  Mail,
  MapPin,
  MessageSquareText,
  Pencil,
  Phone,
  User,
  ShoppingBag,
  Star,
  Video,
  Sparkles,
  Wallet,
  Youtube,
} from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import type { PortfolioVideoApi } from "@/features/creator-portfolio/api/types";
import type { CreatorProfileItemApi } from "@/features/creators/api/types";
import { CreatorPayoutDetailsBanner } from "@/components/dashboard/creator-payout-details-banner";
import { SnapchatIcon } from "@/components/icons/social-icons";
import { formatINR } from "@/lib/format-currency";
import {
  PLATFORM_FEE_RATE,
  calculateOrderEarningsPreview,
  genderOptions,
} from "@/features/creators/hooks/creator-profile-form-utils";
import { VerifiedBadge, GreenCheck } from "@/components/icons/status-icons";
import { StatCard } from "./stat-card";
import { PortfolioCard } from "./portfolio-card";
import { DashboardPayoutDetails } from "./dashboard-payout-details";
import { CreatorReviewsCard } from "./creator-reviews-card";

const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.07, delayChildren: 0.05 },
  },
};

const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 14 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] as const },
  },
};

export function CreatorAccountProfileView({
  profile,
  videos,
}: {
  profile: CreatorProfileItemApi;
  videos: PortfolioVideoApi[];
}) {
  const [aboutExpanded, setAboutExpanded] = useState(false);

  let displayVideos = [...videos];
  if (profile.introVideoUrl) {
    const introVideo: PortfolioVideoApi = {
      id: "intro-video",
      creatorId: profile.userId,
      videoUrl: profile.introVideoUrl,
      thumbnailUrl: null,
      tags: ["Intro"],
      industryLabel: "Intro",
      description: "Intro Video",
      visibilityStatus: "public",
      createdAt: profile.createdAt || new Date().toISOString(),
    };
    displayVideos = [
      introVideo,
      ...displayVideos.filter((v) => v.videoUrl !== profile.introVideoUrl),
    ];
  }

  const topVideos = displayVideos.slice(0, 4);

  const locationString = [profile.city, profile.stateName, profile.countryName]
    .filter(Boolean)
    .join(", ");

  const contentCategories = profile.facetSelections?.filter(f => f.dimension === "CONTENT_CATEGORY").slice(0, 7) || [];
  const displayTags = contentCategories.map((c) => c.label.replace(/\s*\/\s*/g, " & ")).slice(0, 3);
  const extraTagsCount = Math.max(0, contentCategories.length - 3);

  const canCreateWith = profile.facetSelections?.filter(f => f.dimension === "CAN_CREATE_WITH") || [];
  const industryExperience =
    profile.facetSelections?.filter(
      (facet) => facet.dimension === "CATEGORY_EXPERIENCE",
    ) ?? [];
  const appearanceFacets =
    profile.facetSelections?.filter(
      (facet) => facet.dimension === "APPEARANCE",
    ) ?? [];

  const statsList = [
    {
      label: "Total Orders",
      value: profile.totalOrders?.toString() || "0",
      linkText: "View Orders",
      linkUrl: "/creator/orders",
      icon: <ShoppingBag className="size-5" />,
      iconBg: "bg-purple-100",
      iconColor: "text-purple-600",
    },
    {
      label: "Completed Orders",
      value: profile.completedOrders?.toString() || "0",
      linkText: "View Orders",
      linkUrl: "/creator/orders",
      icon: <CheckCircle className="size-5" />,
      iconBg: "bg-emerald-100",
      iconColor: "text-emerald-600",
    },
    {
      label: "Total Earnings",
      value: profile.totalEarnings ? `₹${profile.totalEarnings.toLocaleString()}` : "₹0",
      linkText: "View Earnings",
      icon: <Wallet className="size-5" />,
      iconBg: "bg-orange-100",
      iconColor: "text-orange-600",
    },
    {
      label: "Avg. Rating",
      value: profile.avgRating || "0.0",
      linkText: `${profile.reviewCount || 0} Reviews`,
      linkUrl: "#top-reviews",
      icon: <Star className="size-5" />,
      iconBg: "bg-amber-100",
      iconColor: "text-amber-600",
    },
    // {
    //   label: "Response Rate",
    //   value: profile.responseRate ? `${profile.responseRate}%` : "0%",
    //   linkText: "View Analytics",
    //   icon: <MessageSquareText className="size-5" />,
    //   iconBg: "bg-blue-100",
    //   iconColor: "text-blue-600",
    // },
  ];

  const getHandle = (url: string) => {
    try {
      return new URL(url).pathname.replace(/[@/]/g, "") || "View Profile";
    } catch {
      return url.replace(/[@/]/g, "") || "View Profile";
    }
  };

  const allPlatforms = [
    {
      platform: "Instagram",
      url: profile.instagramUrl,
      icon: <Instagram className="size-4" />,
      bgColor: "bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400",
    },
    {
      platform: "YouTube",
      url: profile.youtubeUrl,
      icon: <Youtube className="size-4" />,
      bgColor: "bg-red-600",
    },
    {
      platform: "Snapchat",
      url: profile.snapchatUrl,
      icon: <SnapchatIcon className="size-4" />,
      bgColor: "bg-yellow-400 text-black",
    },
  ];

  const socialLinksData = allPlatforms.map((p) => ({
    ...p,
    handle: p.url ? getHandle(p.url) : "Not connected",
    url: p.url || undefined,
  }));

  const genderLabel = profile.gender
    ? (genderOptions.find((option) => option.value === profile.gender)?.label ??
      profile.gender)
    : null;
  const ageDisplay =
    profile.age ?? profile.ageRange ?? profile.ageGroup ?? null;

  const primaryPackage = profile.packages[0];
  const platformFeePercent = Math.round(PLATFORM_FEE_RATE * 100);
  const packageEarningsPreview = primaryPackage
    ? calculateOrderEarningsPreview({
        packagePriceAmount: primaryPackage.priceAmount,
        selectedAddOnPrices: (profile.addOns ?? []).map(
          (addOn) => addOn.priceAmount,
        ),
      })
    : null;

  const initials = profile.displayName
    .split(" ")
    .map((n: string) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <motion.div
      className="space-y-6"
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
    >
      <CreatorPayoutDetailsBanner />
      <div className="flex items-start gap-6">
        <motion.div
          className="min-w-0 flex-1 space-y-6"
          variants={staggerContainer}
        >
          <motion.section
            variants={fadeInUp}
            className="overflow-hidden rounded-lg border border-border bg-card shadow-sm"
            aria-label="Profile overview"
          >
            {/* <div className="relative h-44 overflow-hidden bg-gradient-to-br from-blue-50 via-slate-50 to-slate-100">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_40%,rgba(255,255,255,0.4),transparent_50%)]" />

              <div className="absolute bottom-0 right-8 h-32 w-16 rounded-t-2xl bg-white/20 backdrop-blur-sm" />
              <div className="absolute bottom-0 right-28 h-28 w-14 rounded-t-xl bg-white/15 backdrop-blur-sm" />
              <div className="absolute bottom-0 right-48 h-24 w-12 rounded-t-xl bg-white/10 backdrop-blur-sm" />
              <div className="absolute bottom-0 right-64 h-20 w-10 rounded-t-lg bg-white/10" />
            </div> */}

            <div className="p-6">
              <div className="flex flex-col md:flex-row gap-6">
                <div className="relative z-10 shrink-0">
                  {profile.profileImageUrl ? (
                    <img
                      src={profile.profileImageUrl}
                      alt={profile.displayName}
                      className="size-28 rounded-full border-4 border-white object-cover shadow-lg ring-1 ring-border bg-white"
                    />
                  ) : (
                    <div
                      className="flex size-28 items-center justify-center rounded-full border-4 border-white bg-gradient-to-br from-violet-400 to-fuchsia-400 text-3xl font-bold text-white shadow-lg ring-1 ring-border"
                      aria-label={`${profile.displayName} avatar`}
                    >
                      {initials}
                    </div>
                  )}
                </div>

                <div className="flex flex-1 flex-col md:flex-row md:items-stretch justify-between gap-6">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2.5">
                    <h2 className="text-2xl font-bold tracking-tight">
                      {profile.displayName}
                    </h2>
                    <VerifiedBadge />
                  </div>

                  <div className="mt-1.5 flex items-center gap-2 text-sm">
                    {/* <Badge className="rounded-full border-violet-200 bg-violet-100 text-violet-700 hover:bg-violet-100">
                      Top Creator
                    </Badge> */}
                    <span className="text-muted-foreground">•</span>
                    <span className="inline-flex items-center gap-1 text-muted-foreground">
                      {locationString || "Location not set"}
                    </span>
                  </div>

                  <p className="mt-3 max-w-lg text-sm leading-relaxed text-muted-foreground">
                    {profile.bio || "No bio provided."}
                  </p>

                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    {displayTags.map((tag: string) => (
                      <span
                        key={tag}
                        className="rounded-full border border-border bg-background px-3.5 py-1.5 text-sm font-medium text-foreground transition-colors hover:border-blue-200 hover:bg-blue-50/50 shadow-sm"
                      >
                        {tag}
                      </span>
                    ))}
                    {extraTagsCount > 0 && (
                      <span className="rounded-full border border-border bg-muted/30 px-3.5 py-1.5 text-sm font-medium text-muted-foreground shadow-sm">
                        +{extraTagsCount}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex shrink-0 flex-col justify-end gap-3 pb-1">
                  <div className="flex items-center gap-3">
                    <Button variant="outline" size="lg" className="gap-2">
                      <Pencil className="size-3.5" />
                      Preview Public Profile
                      <ExternalLink className="size-3.5 opacity-60" />
                    </Button>
                    <Button size="lg" className="gap-2" asChild>
                      <Link href="/creator/settings/profile">
                        <Pencil className="size-3.5" />
                        Edit Profile
                      </Link>
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
          </motion.section>

          <motion.section
            variants={fadeInUp}
            className="flex flex-col md:flex-row rounded-xl border border-border bg-card shadow-sm overflow-hidden"
            aria-label="Performance metrics"
          >
            {statsList.map((stat, i) => (
              <Fragment key={stat.label}>
                <div className="flex-1">
                  <StatCard stat={stat} />
                </div>
                {i < statsList.length - 1 && (
                  <Separator orientation="vertical" className="hidden md:block h-auto my-6" />
                )}
                {i < statsList.length - 1 && (
                  <Separator orientation="horizontal" className="md:hidden" />
                )}
              </Fragment>
            ))}
          </motion.section>

          <motion.div
            variants={fadeInUp}
            className="grid grid-cols-[1fr_3fr] gap-6"
          >
            <section
              className="rounded-lg border border-border bg-card p-6 shadow-sm"
              aria-label="About the creator"
            >
              <h3 className="text-lg font-bold">About Me</h3>

              <div className="mt-4">
                {profile.bio ? (
                  <>
                    <AnimatePresence mode="wait" initial={false}>
                      <motion.p
                        key={aboutExpanded ? "full" : "truncated"}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className={cn(
                          "text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap",
                          !aboutExpanded && "line-clamp-4",
                        )}
                      >
                        {profile.bio}
                      </motion.p>
                    </AnimatePresence>

                    {(profile.bio.length > 180 || profile.bio.split('\n').length > 4) && (
                      <button
                        onClick={() => setAboutExpanded((prev) => !prev)}
                        className="mt-4 text-sm font-semibold text-primary transition-colors hover:underline"
                        aria-expanded={aboutExpanded}
                      >
                        {aboutExpanded ? "View Less" : "View More"}
                      </button>
                    )}
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-8 bg-muted/30">
                    <MessageSquareText className="size-6 text-muted-foreground/40 mb-2" />
                    <p className="text-sm font-medium text-foreground">No bio provided</p>
                    <p className="text-xs text-muted-foreground mt-1 text-center max-w-[250px]">
                      Add a short bio to let brands know more about your style and personality.
                    </p>
                  </div>
                )}
              </div>

              <ul className="mt-4 space-y-3.5" aria-label="Creator highlights">
                <li className="flex items-center gap-2.5 text-sm">
                  <Phone className="size-5 shrink-0 text-blue-600" strokeWidth={2} />
                  <span className="text-muted-foreground">
                    <strong className="text-foreground font-semibold">Phone:</strong>{" "}
                    {profile.phone ?? "Not specified"}
                  </span>
                </li>

                <li className="flex items-center gap-2.5 text-sm">
                  <Mail className="size-5 shrink-0 text-blue-600" strokeWidth={2} />
                  <span className="text-muted-foreground">
                    <strong className="text-foreground font-semibold">Email:</strong>{" "}
                    {profile.contactEmail ?? "Not specified"}
                  </span>
                </li>

                <li className="flex items-center gap-2.5 text-sm">
                  <User className="size-5 shrink-0 text-blue-600" strokeWidth={2} />
                  <span className="text-muted-foreground">
                    <strong className="text-foreground font-semibold">Gender:</strong>{" "}
                    {genderLabel ?? "Not specified"}
                  </span>
                </li>

                <li className="flex items-center gap-2.5 text-sm">
                  <Calendar className="size-5 shrink-0 text-blue-600" strokeWidth={2} />
                  <span className="text-muted-foreground">
                    <strong className="text-foreground font-semibold">Age:</strong>{" "}
                    {ageDisplay ?? "Not specified"}
                  </span>
                </li>

                {profile.profileLanguages && profile.profileLanguages.length > 0 && (
                  <li className="flex items-center gap-2.5 text-sm">
                    <Globe className="size-5 shrink-0 text-blue-600" strokeWidth={2} />
                    <span className="text-muted-foreground">
                      <strong className="text-foreground font-semibold">Languages:</strong>{" "}
                      {profile.profileLanguages.map(l => l.label).join(", ")}
                    </span>
                  </li>
                )}
                
                {canCreateWith.length > 0 && (
                  <li className="flex items-center gap-2.5 text-sm">
                    <Video className="size-5 shrink-0 text-purple-500" strokeWidth={2} />
                    <span className="text-muted-foreground">
                      <strong className="text-foreground font-semibold">Can create with:</strong>{" "}
                      {canCreateWith.map(f => f.label).join(", ")}
                    </span>
                  </li>
                )}

                <li className="flex items-center gap-2.5 text-sm">
                  <Building2 className="size-5 shrink-0 text-blue-600" strokeWidth={2} />
                  <span className="text-muted-foreground">
                    <strong className="text-foreground font-semibold">
                      Industry Experience:
                    </strong>{" "}
                    {industryExperience.length > 0
                      ? industryExperience
                          .map((facet) =>
                            facet.label.replace(/\s*\/\s*/g, " & "),
                          )
                          .join(", ")
                      : "Not specified"}
                  </span>
                </li>

                <li className="flex items-center gap-2.5 text-sm">
                  <Sparkles className="size-5 shrink-0 text-blue-600" strokeWidth={2} />
                  <span className="text-muted-foreground">
                    <strong className="text-foreground font-semibold">Appearance:</strong>{" "}
                    {appearanceFacets.length > 0
                      ? appearanceFacets
                          .map((facet) =>
                            facet.label.replace(/\s*\/\s*/g, " & "),
                          )
                          .join(", ")
                      : "Not specified"}
                  </span>
                </li>

                {locationString && (
                  <li className="flex items-center gap-2.5 text-sm">
                    <MapPin className="size-4.5 shrink-0 text-blue-600" strokeWidth={2} />
                    <span className="text-muted-foreground">
                      <strong className="text-foreground font-semibold">Based in:</strong>{" "}
                      {locationString}
                    </span>
                  </li>
                )}
              </ul>
            </section>

            <section
              className="rounded-lg border border-border bg-card p-6 shadow-sm"
              aria-label="Top portfolio items"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold">Top Portfolio</h3>
                <Link
                  href="/creator/portfolio"
                  className="text-sm font-semibold text-primary transition-colors hover:underline"
                >
                  View All Portfolio
                </Link>
              </div>

              {topVideos.length > 0 ? (
                <div
                  className={cn(
                    "mt-5 grid gap-4",
                    topVideos.length === 1 && "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
                    topVideos.length === 2 && "grid-cols-2 lg:grid-cols-4",
                    topVideos.length === 3 && "grid-cols-3",
                    topVideos.length >= 4 && "grid-cols-4"
                  )}
                >
                  {topVideos.map((video) => (
                    <PortfolioCard key={video.id} video={video} />
                  ))}
                </div>
              ) : (
                <div className="mt-5 flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-10 bg-muted/30">
                  <Video className="size-8 text-muted-foreground/40 mb-3" />
                  <p className="text-sm font-medium text-foreground">No portfolio items</p>
                  <p className="text-xs text-muted-foreground mt-1">Upload videos to showcase your work.</p>
                </div>
              )}
            </section>
          </motion.div>

          <motion.div
            variants={fadeInUp}
            className="grid grid-cols-1 md:grid-cols-2 gap-6"
          >
            <DashboardPayoutDetails />
            <CreatorReviewsCard reviews={profile.topReviews} />
          </motion.div>
        </motion.div>

        <motion.aside
          className="w-[300px] shrink-0 space-y-6"
          variants={staggerContainer}
          aria-label="Profile sidebar"
        >
          <motion.section
            variants={fadeInUp}
            className="rounded-lg border border-border bg-card p-5 shadow-sm"
            aria-label="Package pricing"
          >
            <h3 className="text-base font-bold">Package</h3>

            {primaryPackage ? (
              <div className="mt-4 space-y-3">
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {primaryPackage.name}
                  </p>
                  <p className="mt-1 text-2xl font-bold tracking-tight">
                    {formatINR(Number(primaryPackage.priceAmount) || 0)}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {primaryPackage.deliveryDays} day delivery ·{" "}
                    {primaryPackage.videoLengthSeconds}s video ·{" "}
                    {primaryPackage.maxRevisions} revisions
                  </p>
                </div>

                <div>
                  <h4 className="text-sm font-semibold">Add-ons</h4>
                  {(profile.addOns ?? []).length > 0 ? (
                    <ul className="mt-2 space-y-2">
                      {(profile.addOns ?? []).map((addOn) => (
                        <li
                          key={addOn.id}
                          className="rounded-lg border border-border bg-muted/30 px-3 py-2"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <span className="text-sm font-medium">
                              {addOn.name}
                            </span>
                            <span className="shrink-0 text-sm font-semibold">
                              {formatINR(Number(addOn.priceAmount) || 0)}
                            </span>
                          </div>
                          {addOn.description ? (
                            <p className="mt-1 text-xs text-muted-foreground">
                              {addOn.description}
                            </p>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-2 text-sm text-muted-foreground">
                      No add-ons configured.
                    </p>
                  )}
                </div>

                {packageEarningsPreview ? (
                  <div className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2.5 text-sm">
                    <p className="text-muted-foreground">
                      Order value
                      {packageEarningsPreview.addOnsTotal > 0
                        ? " (package + add-ons)"
                        : ""}
                      :{" "}
                      <span className="font-medium text-foreground">
                        {formatINR(packageEarningsPreview.orderTotal)}
                      </span>
                    </p>
                    <p className="mt-1 text-muted-foreground">
                      GoCollab fee ({platformFeePercent}%):{" "}
                      <span className="font-medium text-foreground">
                        {formatINR(packageEarningsPreview.platformFee)}
                      </span>
                    </p>
                    <p className="mt-2 text-foreground">
                      Estimated payout:{" "}
                      <strong className="text-base">
                        {formatINR(packageEarningsPreview.creatorEarnings)}
                      </strong>
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Set a valid package price to see your estimated payout.
                  </p>
                )}

                <Button variant="outline" size="sm" className="w-full" asChild>
                  <Link href="/creator/settings/profile">Edit package</Link>
                </Button>
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                <p className="text-sm text-muted-foreground">
                  No package configured yet.
                </p>
                <Button variant="outline" size="sm" className="w-full" asChild>
                  <Link href="/creator/settings/profile">Set up package</Link>
                </Button>
              </div>
            )}
          </motion.section>

          <motion.section
            variants={fadeInUp}
            className="relative rounded-lg border border-border bg-card p-5 shadow-sm opacity-50 pointer-events-none select-none"
            aria-label="Social media links"
            aria-disabled="true"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold">Social Links</h3>
              {/* <Badge variant="secondary" className="text-xs font-medium">Coming Soon</Badge> */}
            </div>

            <nav className="mt-4 space-y-4" aria-label="Social profiles">
              {socialLinksData.map((link) => {
                const Wrapper = link.url ? "a" : "div";
                return (
                  <Wrapper
                    key={link.platform}
                    href={link.url}
                    target={link.url ? "_blank" : undefined}
                    rel={link.url ? "noreferrer" : undefined}
                    className={cn(
                      "group flex items-center gap-3",
                      !link.url && "opacity-50",
                    )}
                    aria-label={`${link.platform}: ${link.handle}`}
                  >
                    <span
                      className={cn(
                        "flex size-8 items-center justify-center rounded-lg text-white",
                        link.bgColor,
                      )}
                      aria-hidden="true"
                    >
                      {link.platform === "Snapchat" ? (
                        <SnapchatIcon className="size-4" />
                      ) : (
                        link.icon
                      )}
                    </span>
                    <span className="text-sm text-muted-foreground transition-colors group-hover:text-foreground">
                      {link.handle}
                    </span>
                  </Wrapper>
                );
              })}
            </nav>
          </motion.section>

          <motion.section
            variants={fadeInUp}
            className="rounded-lg border border-border bg-card p-5 shadow-sm"
            aria-label="Selected categories"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold">
                My Categories{" "}
                {/* <span className="font-normal text-muted-foreground">
                  ({contentCategories.length})
                </span> */}
              </h3>
            </div>

            {contentCategories.length > 0 ? (
              <div className="mt-4 flex flex-wrap gap-2.5">
                {contentCategories.map((cat) => (
                  <div
                    key={cat.id || cat.slug}
                    className="flex items-center gap-3 rounded-2xl border border-border bg-background px-4 py-2.5 transition-colors hover:border-blue-200 hover:bg-blue-50/50 shadow-sm"
                  >
                    <GreenCheck size="sm" />
                    <span className="text-sm font-semibold text-foreground">
                      {cat.label.replace(/\s*\/\s*/g, " & ")}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-4 flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-8 bg-muted/30">
                <ClipboardList className="size-6 text-muted-foreground/40 mb-2" />
                <p className="text-sm font-medium text-foreground">No categories</p>
                <p className="text-xs text-muted-foreground mt-1 text-center max-w-[200px]">
                  Select categories to show brands what you create.
                </p>
              </div>
            )}
          </motion.section>
        </motion.aside>
      </div>
    </motion.div>
  );
}
