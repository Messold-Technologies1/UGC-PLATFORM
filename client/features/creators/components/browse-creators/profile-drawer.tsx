"use client";

import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
  type ReactNode,
} from "react";
import { OrderModal } from "./order-modal";
import { SaveToWishlistButton } from "@/features/wishlists/components/save-to-wishlist-button";
import {
  X,
  MapPin,
  Globe,
  Star,
  Clock,
  Film,
  RefreshCw,
  Zap,
  CheckCircle,
  Play,
  Users,
  Baby,
  PawPrint,
  User,
  Heart,
} from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import type { Creator } from "../../types";
import { useCreatorProfileQuery } from "../../hooks/use-creator-profile-query";
import { useCreatorRatingReviewsQuery } from "../../hooks/use-creator-rating-reviews-query";
import { usePublicPortfolioVideosQuery } from "@/features/creator-portfolio/hooks/use-public-portfolio-videos-query";
import { mapProfileItemToCreatorProfile } from "../../api/map-profile-to-creator";
import { tagColor } from "@/lib/utils";
import { useAuth } from "@/providers/auth-provider";
import { SaveToWishlistModal } from "@/features/wishlists/components/save-to-wishlist-modal";

interface ProfileDrawerProps {
  creatorId: string | null;

  open: boolean;
  onClose: () => void;

  creator: Creator | null;

  /**
   * When true, the "Place order" button redirects guests to the brand register
   * page instead of opening the order/payment modal. Used by the public
   * landing-page browse section.
   */
  landingPage?: boolean;
}

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "packages", label: "Packages" },
  { id: "portfolio", label: "Portfolio" },
  { id: "reviews", label: "Reviews" },
] as const;

type TabId = (typeof TABS)[number]["id"];

const Stars = React.memo(function Stars({
  count,
  size = 13,
}: {
  count: number;
  size?: number;
}) {
  return (
    <span style={{ display: "inline-flex", gap: 1 }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          size={size}
          style={{ color: i <= count ? "#f5a623" : "#e2e2e2" }}
          fill={i <= count ? "#f5a623" : "#e2e2e2"}
        />
      ))}
    </span>
  );
});

const SectionHeading = React.memo(function SectionHeading({
  children,
}: {
  children: ReactNode;
}) {
  return <h4>{children}</h4>;
});

const SkeletonBlock = React.memo(function SkeletonBlock({
  height,
  style,
}: {
  height: number;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className="dr-skeleton-bar"
      style={{ width: "100%", height, ...style }}
    />
  );
});

const OverviewTab = React.memo(function OverviewTab({
  profile,
}: {
  profile: any | null;
}) {
  const specialties = useMemo(() => {
    if (!profile) return [];
    return [...new Set([...profile.categories, ...profile.tags])].slice(0, 10);
  }, [profile]);

  if (!profile) {
    return (
      <div className="dr-section" style={{ paddingTop: 18 }}>
        <SkeletonBlock height={60} />
        <SkeletonBlock height={100} style={{ marginTop: 20 }} />
        <SkeletonBlock height={80} style={{ marginTop: 20 }} />
      </div>
    );
  }

  const detailRows = [
    {
      key: "Languages",
      value: profile.languages.join(", ") || "—",
      icon: Globe,
    },
    {
      key: "Location",
      value: profile.location || "—",
      icon: MapPin,
    },
    {
      key: "Gender",
      value: profile.gender
        ? profile.gender.charAt(0).toUpperCase() + profile.gender.slice(1)
        : "—",
      icon: User,
    },
    {
      key: "Turnaround",
      value: `~${profile.deliveryDays} days`,
      icon: Clock,
    },
  ];

  const canCreateWithIcons: Record<string, typeof Users> = {
    Partner: Users,
    Kids: Baby,
    Pets: PawPrint,
  };

  const whatYouGet = [
    `Delivery within ${profile.deliveryDays} days`,
    profile.basicEditing ? "Basic editing included" : "Editing as add-on",
    profile.storeVisit
      ? "On-location shoots available"
      : "Studio & at-home shoots",
  ];

  return (
    <div>
      <div className="dr-section" style={{ paddingTop: 18 }}>
        <p
          style={{
            fontSize: 14,
            lineHeight: 1.6,
            color: "var(--foreground)",
          }}
        >
          {profile.bio}
        </p>
      </div>

      {specialties.length > 0 && (
        <div className="dr-section">
          <SectionHeading>Specialties</SectionHeading>
          <div className="tagcloud">
            {specialties.map((t) => {
              const [bg, fg] = tagColor(t);
              return (
                <span
                  key={t}
                  className="tag"
                  style={{
                    background: bg,
                    color: fg,
                    fontSize: 12,
                    padding: "5px 10px",
                  }}
                >
                  {t}
                </span>
              );
            })}
          </div>
        </div>
      )}

      <div className="dr-section">
        <SectionHeading>Creator details</SectionHeading>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 10,
          }}
        >
          {detailRows.map((d) => {
            const IconComp = d.icon;
            return (
              <div
                key={d.key}
                style={{
                  display: "flex",
                  gap: 11,
                  alignItems: "flex-start",
                }}
              >
                <div
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 10,
                    background: "var(--muted)",
                    display: "grid",
                    placeItems: "center",
                    color: "var(--muted-foreground)",
                    flexShrink: 0,
                  }}
                >
                  <IconComp size={16} />
                </div>
                <div>
                  <div
                    style={{
                      fontSize: 11,
                      color: "var(--muted-foreground)",
                      fontWeight: 600,
                    }}
                  >
                    {d.key}
                  </div>
                  <div
                    style={{
                      fontSize: 13.5,
                      fontWeight: 600,
                      marginTop: 1,
                    }}
                  >
                    {d.value}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {profile.facetSelections &&
        profile.facetSelections.some(
          (f: any) => f.dimension === "canCreateWith",
        ) && (
          <div className="dr-section">
            <SectionHeading>Can create with</SectionHeading>
            <div style={{ display: "flex", gap: 12 }}>
              {profile.facetSelections
                .filter((f: any) => f.dimension === "canCreateWith")
                .map((f: any) => {
                  const IconComp = canCreateWithIcons[f.label] || Users;
                  return (
                    <div
                      key={f.slug}
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      <div
                        style={{
                          width: 48,
                          height: 48,
                          borderRadius: 14,
                          background: "var(--muted)",
                          display: "grid",
                          placeItems: "center",
                          color: "var(--foreground)",
                        }}
                      >
                        <IconComp size={20} />
                      </div>
                      <span
                        style={{
                          fontSize: 11,
                          color: "var(--muted-foreground)",
                          fontWeight: 600,
                        }}
                      >
                        {f.label}
                      </span>
                    </div>
                  );
                })}
            </div>
          </div>
        )}

      <div className="dr-section">
        <SectionHeading>What you get</SectionHeading>
        <div style={{ display: "grid", gap: 9 }}>
          {whatYouGet.map((feature) => (
            <div
              key={feature}
              style={{
                display: "flex",
                gap: 9,
                alignItems: "center",
                fontSize: 13.5,
                fontWeight: 500,
              }}
            >
              <CheckCircle
                size={16}
                style={{
                  color: "var(--primary)",
                  flexShrink: 0,
                }}
              />
              {feature}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
});

const PackagesTab = React.memo(function PackagesTab({
  profile,
}: {
  profile: any | null;
}) {
  if (!profile) {
    return (
      <div className="dr-section" style={{ paddingTop: 18 }}>
        <SkeletonBlock height={120} />
        <SkeletonBlock height={120} style={{ marginTop: 12 }} />
      </div>
    );
  }

  const packages = profile.packages;
  const creatorFirstName = profile.name.split(" ")[0];

  return (
    <div className="dr-section" style={{ paddingTop: 18 }}>
      <SectionHeading>Packages</SectionHeading>
      {packages.length > 0 ? (
        <>
          {packages.map((pkg: any, idx: number) => {
            const isFeatured = idx === 1;
            return (
              <div
                key={pkg.id}
                className={`pkg${isFeatured ? " featured" : ""}`}
              >
                <div className="pkg-top">
                  <div className="pkg-name">
                    {pkg.label}
                    {isFeatured ? (
                      <span className="pkg-pop">Popular</span>
                    ) : null}
                  </div>
                  <div className="pkg-price">
                    ₹{pkg.price.toLocaleString("en-IN")}
                    <small>{pkg.revisions} revisions</small>
                  </div>
                </div>
                <div className="pkg-meta">
                  <span>
                    <Clock size={13} /> {pkg.deliveryDays} day delivery
                  </span>
                  <span>
                    <Film size={13} /> Video
                  </span>
                  <span>
                    <RefreshCw size={13} /> {pkg.revisions} revisions
                  </span>
                </div>
                <div className="pkg-deliv">
                  {pkg.features.map((f: string) => (
                    <span key={f} className="deliv-tag">
                      {f}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </>
      ) : (
        <p
          style={{
            fontSize: 13,
            color: "var(--muted-foreground)",
          }}
        >
          No packages available yet.
        </p>
      )}

      <div
        style={{
          marginTop: 14,
          padding: "13px 15px",
          background: "var(--muted)",
          borderRadius: "var(--radius)",
          display: "flex",
          gap: 10,
          alignItems: "center",
          fontSize: 12.5,
          color: "var(--muted-foreground)",
          fontWeight: 500,
        }}
      >
        <Zap size={16} style={{ color: "var(--primary)", flexShrink: 0 }} />
        Need something custom? Send a brief and {creatorFirstName} will quote
        within 24h.
      </div>
    </div>
  );
});

const PortfolioTab = React.memo(function PortfolioTab({
  validPortfolioVideos,
  showIntro,
  introUrl,
  onVideoError,
  onIntroError,
  isLoading,
}: {
  validPortfolioVideos: any[];
  showIntro: boolean;
  introUrl?: string;
  onVideoError: (id: string) => void;
  onIntroError: () => void;
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <div className="dr-section" style={{ paddingTop: 18 }}>
        <SkeletonBlock height={200} />
      </div>
    );
  }

  return (
    <div className="dr-section" style={{ paddingTop: 18 }}>
      <SectionHeading>
        Portfolio{" "}
        {validPortfolioVideos.length > 0
          ? `· ${validPortfolioVideos.length + (showIntro ? 1 : 0)} videos`
          : ""}
      </SectionHeading>
      <div className="pfgrid">
        {showIntro && introUrl && (
          <div className="pfitem">
            <video
              src={introUrl}
              className="real-media"
              controls
              playsInline
              preload="metadata"
              onError={onIntroError}
            />
          </div>
        )}

        {validPortfolioVideos.map((video) => (
          <div key={video.id} className="pfitem">
            <video
              src={video.videoUrl}
              className="real-media"
              controls
              playsInline
              preload="metadata"
              poster={video.thumbnailUrl ?? undefined}
              onError={() => onVideoError(video.id)}
            />
          </div>
        ))}
      </div>
    </div>
  );
});

const ReviewsTab = React.memo(function ReviewsTab({
  creatorId,
}: {
  creatorId: string;
}) {
  const { data: reviewsData } = useCreatorRatingReviewsQuery(creatorId, {
    limit: 10,
  });

  if (!reviewsData) {
    return (
      <div className="dr-section" style={{ paddingTop: 18 }}>
        <SkeletonBlock height={60} />
        <SkeletonBlock height={80} style={{ marginTop: 12 }} />
        <SkeletonBlock height={80} style={{ marginTop: 12 }} />
      </div>
    );
  }

  const avgRating = reviewsData.avgRating
    ? parseFloat(reviewsData.avgRating)
    : 0;
  const reviews = reviewsData.items;

  const AVATAR_COLORS = [
    "#7c3aed",
    "#0369a1",
    "#be185d",
    "#15803d",
    "#c2410c",
    "#0f766e",
  ];

  return (
    <div className="dr-section" style={{ paddingTop: 18 }}>
      <SectionHeading>Ratings &amp; reviews</SectionHeading>

      {/* Summary bar */}
      <div className="rev-sum">
        <div className="big">{avgRating.toFixed(1)}</div>
        <div>
          <Stars count={Math.round(avgRating)} size={15} />
          <div
            style={{
              fontSize: 12.5,
              color: "var(--muted-foreground)",
              fontWeight: 600,
              marginTop: 3,
            }}
          >
            Based on {reviewsData.reviewCount} verified orders
          </div>
        </div>
      </div>

      {reviews.length > 0 ? (
        reviews.map((review: any, i: number) => {
          const brandName = review.brand?.brandName || "Brand";
          const dateStr = review.createdAt
            ? new Date(review.createdAt).toLocaleDateString("en-IN", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })
            : "";
          return (
            <div className="rev" key={review.id}>
              <div className="rev-head">
                <div
                  className="rev-ava"
                  style={{
                    background: AVATAR_COLORS[i % AVATAR_COLORS.length],
                  }}
                >
                  {brandName.slice(0, 1).toUpperCase()}
                </div>
                <div className="rev-meta">
                  <div className="bn">{brandName}</div>
                  <div className="dt">{dateStr}</div>
                </div>
                <div className="rev-stars">
                  <Stars count={review.rating} />
                </div>
              </div>
              {review.review && <p>{review.review}</p>}
              {review.packageNameSnapshot && (
                <div className="pkgtag">
                  Ordered · {review.packageNameSnapshot}
                </div>
              )}
            </div>
          );
        })
      ) : (
        <p
          style={{
            fontSize: 13,
            color: "var(--muted-foreground)",
          }}
        >
          No reviews yet.
        </p>
      )}
    </div>
  );
});

export const ProfileDrawer = React.memo(function ProfileDrawer({
  creatorId,
  open,
  onClose,
  creator,
  landingPage = false,
}: ProfileDrawerProps) {
  const router = useRouter();
  const { user } = useAuth();
  const isBrand = user?.roles?.includes("BRAND") ?? false;
  const [wishlistOpen, setWishlistOpen] = useState(false);
  const lastCreatorRef = useRef(creator);
  const lastIdRef = useRef(creatorId);
  if (creator) lastCreatorRef.current = creator;
  if (creatorId) lastIdRef.current = creatorId;

  const c = creator || lastCreatorRef.current;
  const activeId = creatorId || lastIdRef.current;

  const [tab, setTab] = useState<TabId>("overview");
  const [orderOpen, setOrderOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const [failedVideos, setFailedVideos] = useState<Set<string>>(new Set());
  const [introFailed, setIntroFailed] = useState(false);

  const creatorIndex = useMemo(
    () =>
      activeId
        ? activeId.split("").reduce((acc, ch) => acc + ch.charCodeAt(0), 0)
        : 0,
    [activeId],
  );

  useEffect(() => {
    if (open) {
      setTab("overview");
      if (scrollRef.current) scrollRef.current.scrollTop = 0;
    } else {
      setOrderOpen(false);
    }
  }, [open, activeId]);

  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      if (orderOpen) {
        setOrderOpen(false);
        return;
      }
      onCloseRef.current();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, orderOpen]);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const { data: rawPortfolioVideos = [], isLoading: isVideosLoading } =
    usePublicPortfolioVideosQuery(activeId ?? "", { enabled: !!activeId });

  const {
    data: profileApi,
    isLoading: isProfileLoading,
    isError: isProfileError,
  } = useCreatorProfileQuery(activeId ?? "", {
    enabled: open && !!activeId,
  });

  const profile = useMemo(
    () => (profileApi ? mapProfileItemToCreatorProfile(profileApi) : null),
    [profileApi],
  );

  const portfolioVideos = useMemo(() => {
    return rawPortfolioVideos.filter((v) => {
      if (
        !v.videoUrl ||
        v.videoUrl.length < 5 ||
        v.videoUrl === "null" ||
        v.videoUrl === "undefined"
      )
        return false;
      if (c?.introVideoUrl && v.videoUrl === c.introVideoUrl) return false;
      return true;
    });
  }, [rawPortfolioVideos, c?.introVideoUrl]);

  const handleVideoError = useCallback((videoId: string) => {
    setFailedVideos((prev) => {
      const next = new Set(prev);
      next.add(videoId);
      return next;
    });
  }, []);

  const handleIntroError = useCallback(() => {
    setIntroFailed(true);
  }, []);

  const portfolioTiles = useMemo(
    () =>
      portfolioVideos.map((video) => ({
        id: video.id,
        label: video.industryLabel || "UGC",
        videoUrl: video.videoUrl,
        thumbnailUrl: video.thumbnailUrl,
      })),
    [portfolioVideos],
  );

  const validPortfolioTiles = useMemo(
    () => portfolioTiles.filter((tile) => !failedVideos.has(tile.id)),
    [portfolioTiles, failedVideos],
  );

  if (!c) return null;

  const verified = c.rating >= 4.8;
  const profileUrl = `/brand/creators/${c.id}`;

  const showIntro = !!c.introVideoUrl && !introFailed;

  return (
    <>
      <div
        className={`browse-scrim${open ? " show" : ""}`}
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className={`browse-drawer${open ? " show" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label={`${c.name} profile`}
      >
        <div className="absolute right-4 top-4 z-10 flex items-center gap-2">
          {isBrand && c && (
            <button
              type="button"
              onClick={() => setWishlistOpen(true)}
              className="flex size-8 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-sm transition-all hover:bg-pink-500"
              aria-label={`Save ${c.name} to wishlist`}
            >
              <Heart size={16} />
            </button>
          )}
          <button
            type="button"
            className="dr-close"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div className="drawer-scroll" ref={scrollRef}>
          {(validPortfolioTiles.length > 0 || showIntro) && (
            <div className="dr-work">
              <div className="dr-work-head">
                <span className="dr-work-lbl">
                  <Play size={12} /> Recent work
                </span>
                <span className="dr-work-count">
                  {validPortfolioTiles.length + (showIntro ? 1 : 0)} reels
                </span>
              </div>
              <div className="dr-reelstrip">
                {showIntro && c.introVideoUrl && (
                  <div className="dr-reeltile intro">
                    <video
                      src={c.introVideoUrl}
                      className="real-media"
                      controls
                      playsInline
                      preload="metadata"
                      poster={c.previewVideoThumbnail || c.thumbnail}
                      onError={handleIntroError}
                    />
                    <div className="tscrim" style={{ pointerEvents: "none" }} />
                    <span className="tbadge" style={{ pointerEvents: "none" }}>
                      Intro reel
                    </span>
                  </div>
                )}

                {validPortfolioTiles.map((tile) => (
                  <div
                    key={tile.id}
                    className="dr-reeltile"
                    style={{ background: "#111" }}
                  >
                    <video
                      src={tile.videoUrl}
                      className="real-media"
                      controls
                      playsInline
                      preload="metadata"
                      poster={tile.thumbnailUrl || undefined}
                      onError={() => handleVideoError(tile.id)}
                    />
                    <div className="tscrim" style={{ pointerEvents: "none" }} />
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="dr-identity">
            <div className="dr-name">
              {c.name}
              {verified ? <CheckCircle size={19} className="verif" /> : null}
            </div>
            <div className="dr-sub" style={{ marginTop: 5 }}>
              <MapPin size={14} /> {c.location}
              <span style={{ opacity: 0.4 }}>·</span>
              <Globe size={14} /> {c.languages.join(", ")}
            </div>

            <div className="dr-stats">
              {c.reviewCount > 0 ? (
                <div className="dr-stat">
                  <div className="v">
                    <Star
                      size={16}
                      style={{ color: "#f5a623" }}
                      fill="#f5a623"
                    />{" "}
                    {c.rating.toFixed(1)}
                  </div>
                  <div className="k">{c.reviewCount} reviews</div>
                </div>
              ) : (profileApi?.collaborationCount ?? c.collaborationCount ?? 0) > 0 ? (
                <div className="dr-stat">
                  <div className="v">
                    {profileApi?.collaborationCount ??
                      c.collaborationCount ??
                      0}
                  </div>
                  <div className="k">Collaborations</div>
                </div>
              ) : null}
              {(profileApi?.completedOrders ?? c.ordersCompleted ?? 0) > 0 && (
                <div className="dr-stat">
                  <div className="v">
                    {profileApi?.completedOrders ?? c.ordersCompleted ?? 0}
                  </div>
                  <div className="k">Orders completed</div>
                </div>
              )}
              {(c.reviewCount > 0 || (profileApi?.collaborationCount ?? c.collaborationCount ?? 0) > 0) && (
                <div className="dr-stat">
                  <div className="v">{c.deliveryDays} days</div>
                  <div className="k">Delivery time</div>
                </div>
              )}
            </div>
          </div>
          <div className="dr-tabs">
            {TABS.map((t) => {
              if (t.id === "reviews" && c.reviewCount === 0) return null;
              return (
                <button
                  key={t.id}
                  type="button"
                  className={tab === t.id ? "on" : ""}
                  onClick={() => setTab(t.id)}
                >
                  {t.label}
                </button>
              );
            })}
          </div>

          {activeId && tab === "overview" && <OverviewTab profile={profile} />}
          {activeId && tab === "packages" && <PackagesTab profile={profile} />}
          {activeId && tab === "portfolio" && (
            <PortfolioTab
              validPortfolioVideos={validPortfolioTiles}
              showIntro={showIntro}
              introUrl={c.introVideoUrl ?? undefined}
              onVideoError={handleVideoError}
              onIntroError={handleIntroError}
              isLoading={isProfileLoading || isVideosLoading}
            />
          )}
          {activeId && tab === "reviews" && <ReviewsTab creatorId={activeId} />}

          <div style={{ height: 8 }} />
        </div>

        <div className="dr-foot">
          <div style={{ marginRight: "auto" }}>
            <div className="from">Starting from</div>
            <div className="amt">
              ₹{c.startingPrice.toLocaleString("en-IN")}
            </div>
          </div>
          {!landingPage && activeId && (
            <SaveToWishlistButton
              creatorId={activeId}
              creatorName={c?.name ?? ""}
              creatorImageUrl={c?.thumbnail}
            />
          )}
          <button
            type="button"
            className={`dr-btn dr-btn-primary flex-1 ${!landingPage && (!profile || isProfileLoading || isProfileError) ? "opacity-50 cursor-not-allowed" : ""}`}
            disabled={
              !landingPage && (!profile || isProfileLoading || isProfileError)
            }
            onClick={() => {
              if (landingPage) {
                router.push("/register/brand");
                return;
              }
              if (isProfileError) {
                toast.error("Could not load creator packages. Try again.");
                return;
              }
              setOrderOpen(true);
            }}
          >
            <Zap size={16} /> Place order
          </button>
        </div>
      </div>

      <OrderModal
        creator={profile}
        open={orderOpen}
        isLoading={isProfileLoading}
        onClose={() => setOrderOpen(false)}
      />

      {wishlistOpen && c && (
        <SaveToWishlistModal
          open={wishlistOpen}
          onClose={() => setWishlistOpen(false)}
          creatorId={c.id}
          creatorName={c.name}
        />
      )}
    </>
  );
});
