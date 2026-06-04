"use client";

import { useState, Fragment } from "react";
import { AnimatePresence, motion, type Variants } from "framer-motion";
import {
  BarChart3,
  CheckCircle,
  ClipboardList,
  ExternalLink,
  Globe,
  Instagram,
  MapPin,
  MessageSquareText,
  Pencil,
  ShoppingBag,
  Star,
  Video,
  Cpu,
  Wallet,
  Youtube,
} from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import type { PortfolioVideoApi } from "@/features/creator-portfolio/api/types";
import type { CreatorProfileItemApi } from "@/features/creators/api/types";
import { CreatorPayoutDetailsBanner } from "@/components/dashboard/creator-payout-details-banner";
import { TikTokIcon, SnapchatIcon } from "@/components/icons/social-icons";
import { VerifiedBadge, GreenCheck } from "@/components/icons/status-icons";
import { StatCard } from "./stat-card";
import { PortfolioCard } from "./portfolio-card";
import { DashboardPayoutDetails } from "./dashboard-payout-details";

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

  const topVideos = videos.slice(0, 3);

  const locationString = [profile.city, profile.stateName, profile.countryName]
    .filter(Boolean)
    .join(", ");

  const contentCategories = profile.facetSelections?.filter(f => f.dimension === "CONTENT_CATEGORY").slice(0, 7) || [];
  const displayTags = contentCategories.map((c) => c.label.replace(/\s*\/\s*/g, " & ")).slice(0, 3);
  const extraTagsCount = Math.max(0, contentCategories.length - 3);

  const aiPermissions = profile.facetSelections?.filter(f => f.dimension === "AI_CONTENT_PERMISSION") || [];
  const canCreateWith = profile.facetSelections?.filter(f => f.dimension === "CAN_CREATE_WITH") || [];

  const statsList = [
    {
      label: "Total Orders",
      value: profile.totalOrders?.toString() || "0",
      linkText: "View Orders",
      icon: <ShoppingBag className="size-5" />,
      iconBg: "bg-purple-100",
      iconColor: "text-purple-600",
    },
    {
      label: "Completed Orders",
      value: profile.completedOrders?.toString() || "0",
      linkText: "View Orders",
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
      platform: "TikTok",
      url: profile.tiktokUrl,
      icon: <TikTokIcon className="size-4" />,
      bgColor: "bg-black",
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

  const languagesText = profile.profileLanguages?.length
    ? profile.profileLanguages.map((l) => l.label).join(", ")
    : "Not specified";

  const profileDetails = [
    { label: "Name", value: profile.displayName },
    {
      label: "Username",
      value: profile.displayName.toLowerCase().replace(/\s+/g, "."),
    },
    { label: "Location", value: locationString || "Not specified" },
    { label: "Languages", value: languagesText },
    { label: "Time Zone", value: profile.timezone || "Not specified" },
    { label: "Member Since", value: profile.createdAt ? new Date(profile.createdAt).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" }) : "Not specified" },
  ];

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
            <div className="relative h-44 overflow-hidden bg-gradient-to-br from-blue-50 via-slate-50 to-slate-100">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_40%,rgba(255,255,255,0.4),transparent_50%)]" />

              <div className="absolute bottom-0 right-8 h-32 w-16 rounded-t-2xl bg-white/20 backdrop-blur-sm" />
              <div className="absolute bottom-0 right-28 h-28 w-14 rounded-t-xl bg-white/15 backdrop-blur-sm" />
              <div className="absolute bottom-0 right-48 h-24 w-12 rounded-t-xl bg-white/10 backdrop-blur-sm" />
              <div className="absolute bottom-0 right-64 h-20 w-10 rounded-t-lg bg-white/10" />
            </div>

            <div className="px-6 pb-6">
              <div className="relative z-10 -mt-14">
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

              <div className="mt-4 flex items-stretch justify-between gap-6">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2.5">
                    <h2 className="text-2xl font-bold tracking-tight">
                      {profile.displayName}
                    </h2>
                    <VerifiedBadge />
                  </div>

                  <div className="mt-1.5 flex items-center gap-2 text-sm">
                    <Badge className="rounded-full border-violet-200 bg-violet-100 text-violet-700 hover:bg-violet-100">
                      Top Creator
                    </Badge>
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
            className="grid grid-cols-[2fr_3fr] gap-6"
          >
            <section
              className="rounded-lg border border-border bg-card p-6 shadow-sm"
              aria-label="About the creator"
            >
              <h3 className="text-lg font-bold">About Me</h3>

              <div className="mt-4">
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
                    {profile.bio || "No bio provided."}
                  </motion.p>
                </AnimatePresence>
              </div>

              <ul className="mt-4 space-y-3.5" aria-label="Creator highlights">
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

                {aiPermissions.length > 0 && (
                  <li className="flex items-start gap-2.5 text-sm">
                    <Cpu className="mt-0.5 size-5 shrink-0 text-emerald-600" strokeWidth={2} />
                    <div className="flex flex-col gap-1">
                      <strong className="text-foreground font-semibold">AI Training:</strong>
                      <ul className="list-disc list-outside ml-4 text-muted-foreground space-y-0.5">
                        {aiPermissions.map((f, i) => (
                          <li key={i}>{f.label.replace(/^AI\s+/i, '').replace(/\s*\/\s*/g, " & ")}</li>
                        ))}
                      </ul>
                    </div>
                  </li>
                )}

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

              <button
                onClick={() => setAboutExpanded((prev) => !prev)}
                className="mt-4 text-sm font-semibold text-primary transition-colors hover:underline"
                aria-expanded={aboutExpanded}
              >
                {aboutExpanded ? "View Less" : "View More"}
              </button>
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

              <div className="mt-5 grid grid-cols-3 gap-4">
                {topVideos.length > 0 ? (
                  topVideos.map((video) => (
                    <PortfolioCard key={video.id} video={video} />
                  ))
                ) : (
                  <p className="col-span-3 text-sm text-muted-foreground">
                    No portfolio items added yet.
                  </p>
                )}
              </div>
            </section>
          </motion.div>

          <DashboardPayoutDetails />
        </motion.div>

        <motion.aside
          className="w-[300px] shrink-0 space-y-6"
          variants={staggerContainer}
          aria-label="Profile sidebar"
        >
          <motion.section
            variants={fadeInUp}
            className="rounded-lg border border-border bg-card p-5 shadow-sm"
            aria-label="Social media links"
          >
            <h3 className="text-base font-bold">Social Links</h3>

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
                      {link.platform === "TikTok" ? (
                        <TikTokIcon className="size-4" />
                      ) : link.platform === "Snapchat" ? (
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
            aria-label="Profile details"
          >
            <h3 className="text-base font-bold">Profile Details</h3>
            <dl className="mt-4 space-y-3.5">
              {profileDetails.map((row) => (
                <div
                  key={row.label}
                  className="flex items-center justify-between text-sm"
                >
                  <dt className="text-muted-foreground">{row.label}</dt>
                  <dd className="font-medium text-foreground text-right ml-4">
                    {row.value}
                  </dd>
                </div>
              ))}
            </dl>
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
          </motion.section>
        </motion.aside>
      </div>
    </motion.div>
  );
}
