"use client";

import { useCallback, useState, useMemo } from "react";
import { isAxiosError } from "axios";
import {
  Image as ImageIcon,
  Play,
  Plus,
  FolderPlus,
  Trash2,
  ExternalLink,
  Settings,
  Sparkles,
  CheckCircle2,
  Layout,
  Copy,
  X,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/dashboard/page-header";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { CreatorPortfolioUploadForm } from "./creator-portfolio-upload-form.lazy";
import { CreatorPortfolioSectionsView } from "./creator-portfolio-sections-view";
import { ManageSectionsModal } from "./manage-sections-modal";
import { VideoSectionAssignmentModal } from "./video-section-assignment-modal";
import type { PortfolioVideoApi } from "../api/types";
import { useDeletePortfolioVideoMutation } from "../hooks/use-delete-portfolio-video-mutation";
import { useMyPortfolioVideosQuery } from "../hooks/use-my-portfolio-videos-query";
import { useMyPortfolioSectionsQuery } from "../hooks/use-portfolio-sections";
import { useCreatorProfileMeQuery } from "@/features/creators/hooks/use-creator-profile-me-query";
import { MIN_PORTFOLIO_VIDEOS } from "@/features/creators/lib/go-live-requirements";
import {
  creatorPublicProfileDisplayUrlForProfile,
  creatorPublicProfilePathForProfile,
  creatorPublicProfileUrlForProfile,
} from "@/features/creators/lib/creator-public-profile-url";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from "sonner";
import { AddReelSourceSheet } from "@/features/instagram-import/components/add-reel-source-sheet";
import { InstagramReelGallery } from "@/features/instagram-import/components/instagram-reel-gallery";
import { useSocialConnectionsQuery } from "@/features/creators/hooks/use-social-connections";
import { getInstagramConnectUrl } from "@/features/creators/api/social-connections";
// import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip as ChartTooltip,
} from "chart.js";

ChartJS.register(ArcElement, ChartTooltip);

function errorMessage(err: unknown): string {
  if (isAxiosError(err)) {
    const data = err.response?.data as
      | { message?: string | string[] }
      | undefined;
    const m = data?.message;
    if (Array.isArray(m)) return m.join(", ");
    if (typeof m === "string") return m;
    return err.message;
  }
  if (err instanceof Error) return err.message;
  return "Something went wrong";
}

export function CreatorPortfolioManager() {
  const [isUploadOverlayOpen, setIsUploadOverlayOpen] = useState(false);
  const [isSourceSheetOpen, setIsSourceSheetOpen] = useState(false);
  const [isReelGalleryOpen, setIsReelGalleryOpen] = useState(false);
  const [connectingInstagram, setConnectingInstagram] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [showBanner, setShowBanner] = useState(true);

  const activeTab =
    searchParams?.get("tab") === "sections" ? "sections" : "all";

  const [isManageSectionsOpen, setIsManageSectionsOpen] = useState(false);
  const [assignVideoId, setAssignVideoId] = useState<string | null>(null);
  // const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [selectedSort, setSelectedSort] = useState("newest");
  const [visibleCount, setVisibleCount] = useState(6);

  const setActiveTab = useCallback(
    (tab: string) => {
      const params = new URLSearchParams(searchParams?.toString() || "");
      if (tab === "all") {
        params.delete("tab");
      } else {
        params.set("tab", tab);
      }
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [searchParams, pathname, router],
  );

  const handleSortChange = useCallback((value: string) => {
    setSelectedSort(value);
    setVisibleCount(6);
  }, []);

  const deletePortfolioVideoMutation = useDeletePortfolioVideoMutation();
  const videosQuery = useMyPortfolioVideosQuery({
    staleTime: 5 * 60_000,
  });
  const sectionsQuery = useMyPortfolioSectionsQuery();
  const sectionsCount = sectionsQuery.data?.length ?? 0;
  const profileQuery = useCreatorProfileMeQuery();

  const videos = useMemo(() => videosQuery.data ?? [], [videosQuery.data]);
  const loading = videosQuery.isPending;
  const publicProfileDisplayUrl = profileQuery.data
    ? creatorPublicProfileDisplayUrlForProfile(profileQuery.data)
    : null;
  const publicProfilePath = profileQuery.data
    ? creatorPublicProfilePathForProfile(profileQuery.data)
    : null;
  // The public profile page 404s until the creator is approved, so the "view"
  // and "copy link" actions only make sense once the profile is APPROVED.
  const isApproved = profileQuery.data?.approvalStatus === "APPROVED";
  const canSharePublicProfile = Boolean(publicProfilePath) && isApproved;

  const handleCopyPublicProfileLink = useCallback(async () => {
    if (!profileQuery.data) return;
    const url = creatorPublicProfileUrlForProfile(profileQuery.data);
    if (!url) return;

    try {
      await navigator.clipboard.writeText(url);
      toast.success("Public profile link copied");
    } catch {
      toast.error("Could not copy link");
    }
  }, [profileQuery.data]);

  const displayedVideos = useMemo(() => {
    const filtered = [...videos];

    filtered.sort((a, b) => {
      const timeA = new Date(a.createdAt).getTime();
      const timeB = new Date(b.createdAt).getTime();
      if (selectedSort === "newest") return timeB - timeA;
      if (selectedSort === "oldest") return timeA - timeB;
      return 0;
    });

    return filtered;
  }, [videos, selectedSort]);

  const socialConnectionsQuery = useSocialConnectionsQuery({ enabled: true });
  /** Drives the Instagram option in the add-reel chooser. */
  const instagramChooserState:
    | "connected"
    | "not_connected"
    | "reconnect_required" = (() => {
    const connection = (socialConnectionsQuery.data ?? []).find(
      (c) => c.platform === "INSTAGRAM",
    );
    if (!connection) return "not_connected";
    return connection.status === "ACTIVE" ? "connected" : "reconnect_required";
  })();

  const startInstagramConnect = useCallback(async () => {
    setConnectingInstagram(true);
    try {
      // Come back to this page, not settings, so the creator keeps their place.
      const url = await getInstagramConnectUrl(
        `${window.location.pathname}${window.location.search}`,
      );
      window.location.href = url;
    } catch {
      toast.error("Could not start the Instagram connection");
      setConnectingInstagram(false);
    }
  }, []);

  const canDeleteVideos = videos.length > MIN_PORTFOLIO_VIDEOS;

  const handleDelete = useCallback(
    async (video: PortfolioVideoApi) => {
      if (!canDeleteVideos) {
        toast.error(
          `A portfolio must keep at least ${MIN_PORTFOLIO_VIDEOS} videos`,
          {
            description: "Replace an existing video instead of deleting one.",
          },
        );
        return;
      }

      if (
        !window.confirm(
          "Remove this video from your portfolio? This cannot be undone.",
        )
      ) {
        return;
      }

      setDeletingId(video.id);

      deletePortfolioVideoMutation.mutate(
        { videoId: video.id },
        {
          onSettled: () => {
            setDeletingId((current) => (current === video.id ? null : current));
          },
        },
      );
    },
    [canDeleteVideos, deletePortfolioVideoMutation],
  );

  if (videosQuery.isError) {
    return (
      <div className="space-y-8">
        <PageHeader
          title="Portfolio"
          description="Showcase your best work and attract brands."
        />
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6">
          <p className="text-sm font-medium text-destructive">
            Could not load portfolio
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {errorMessage(videosQuery.error)}
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-4"
            onClick={() => void videosQuery.refetch()}
          >
            Try again
          </Button>
        </div>
      </div>
    );
  }

  const staticCounts = {
    all: videos.length,
    videos: videos.length,
    images: 0,
    other: 0,
  };

  return (
    <div className="space-y-6 pt-4 lg:pt-5">
      <div className="flex flex-col xl:flex-row gap-8 items-start">
        <div className="flex-1 w-full space-y-6 min-w-0">
          <div
            className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-2"
            data-tour="creator-portfolio-header"
          >
            <div className="flex items-center gap-6 overflow-x-auto no-scrollbar">
              <button
                onClick={() => setActiveTab("all")}
                className={`flex items-center gap-2 pb-2 border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === "all"
                    ? "border-primary text-primary font-semibold"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                All Works
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full ${activeTab === "all" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}
                >
                  {staticCounts.all}
                </span>
              </button>
              <button
                onClick={() => setActiveTab("sections")}
                className={`flex items-center gap-2 pb-2 border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === "sections"
                    ? "border-primary text-primary font-semibold"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                Sections
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full ${activeTab === "sections" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}
                >
                  {sectionsCount}
                </span>
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full sm:w-auto sm:shrink-0">
              <Button asChild className="gap-2 flex-1 sm:flex-none">
                <Link
                  href="/creator/portfolio/upload"
                  data-tour="creator-portfolio-upload"
                >
                  <Plus className="size-4" />
                  Add New Work
                </Link>
              </Button>
              <Button
                variant="outline"
                className="gap-2 bg-background flex-1 sm:flex-none"
                onClick={() => setIsManageSectionsOpen(true)}
              >
                <Settings className="size-4" />
                Manage Sections
              </Button>
              {canSharePublicProfile ? (
                <Button
                  variant="outline"
                  className="gap-2 bg-background basis-full sm:basis-auto"
                  asChild
                >
                  <Link
                    href={publicProfilePath ?? "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    View my public profile <ExternalLink className="size-4" />
                  </Link>
                </Button>
              ) : (
                <TooltipProvider delayDuration={150}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      {/* Wrapping span keeps hover/focus flowing to the tooltip
                          even though the button itself is disabled. */}
                      <span tabIndex={0} className="basis-full sm:basis-auto">
                        <Button
                          variant="outline"
                          disabled
                          aria-disabled
                          className="pointer-events-none w-full gap-2 bg-background opacity-50 sm:w-auto"
                        >
                          View my public profile{" "}
                          <ExternalLink className="size-4" />
                        </Button>
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>
                      Available once your profile is approved
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
          </div>

          {showBanner && (
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-primary/5 border border-primary/10 rounded-lg gap-4">
              <div className="flex items-center gap-4">
                <div className="flex shrink-0 size-10 items-center justify-center rounded-xl bg-background border border-primary/20 text-primary">
                  <Layout className="size-5" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground">
                    Organize your portfolio in sections
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Sections help brands find the type of content they&apos;re
                    looking for easily.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 sm:gap-3 shrink-0 w-full sm:w-auto">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2 bg-background border-primary/20 text-primary hover:bg-primary/10 hover:text-primary flex-1 sm:flex-none sm:w-auto"
                  onClick={() => setIsManageSectionsOpen(true)}
                >
                  <Plus className="size-3.5" />
                  Create Section
                </Button>
                <button
                  onClick={() => setShowBanner(false)}
                  className="shrink-0 text-muted-foreground hover:text-foreground"
                  aria-label="Dismiss"
                >
                  <X className="size-5" />
                </button>
              </div>
            </div>
          )}

          {activeTab === "sections" ? (
            <CreatorPortfolioSectionsView />
          ) : (
            <>
              <div className="flex flex-col sm:flex-row justify-between gap-4">
                <div className="flex flex-wrap items-center gap-3">
                  <Select value={selectedSort} onValueChange={handleSortChange}>
                    <SelectTrigger className="w-[130px] bg-background">
                      <SelectValue placeholder="Newest First" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="newest">Newest First</SelectItem>
                      <SelectItem value="oldest">Oldest First</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {loading ? (
                <div className="flex min-h-80 items-center justify-center rounded-lg border border-dashed border-border/80 bg-background">
                  <Spinner className="size-8 text-muted-foreground" />
                </div>
              ) : videos.length === 0 ? (
                <div className="flex min-h-[400px] flex-col items-center justify-center rounded-lg border border-dashed border-border/80 bg-background">
                  <div className="mb-4 flex size-14 items-center justify-center rounded-lg bg-primary/10">
                    <ImageIcon className="size-6 text-primary" />
                  </div>
                  <p className="text-sm font-medium">Your portfolio is empty</p>
                  <p className="mt-1 max-w-xs text-center text-xs text-muted-foreground">
                    Upload videos to your best UGC content to attract brand
                    deals.
                  </p>
                  <Button size="sm" className="mt-4 gap-1.5" asChild>
                    <Link href="/creator/portfolio/upload">
                      <Plus className="size-3.5" />
                      Upload your first piece
                    </Link>
                  </Button>
                </div>
              ) : (
                <>
                  {displayedVideos.length === 0 && videos.length > 0 ? (
                    <div className="col-span-full py-12 text-center text-muted-foreground text-sm">
                      No videos match your selected filters.
                    </div>
                  ) : (
                    <div
                      className="grid gap-5 grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
                      data-tour="creator-portfolio-cards"
                    >
                      {displayedVideos
                        .slice(0, visibleCount)
                        .map((v, index) => {
                          const updateDuration = (
                            video: HTMLVideoElement | null,
                          ) => {
                            if (
                              video &&
                              video.duration &&
                              isFinite(video.duration)
                            ) {
                              const minutes = Math.floor(video.duration / 60);
                              const seconds = Math.floor(video.duration % 60);
                              const formatted = `${minutes}:${seconds.toString().padStart(2, "0")}`;
                              const pill =
                                video.parentElement?.querySelector(
                                  ".duration-pill",
                                );
                              if (pill && pill.textContent !== formatted)
                                pill.textContent = formatted;
                            }
                          };

                          return (
                            <div
                              key={v.id}
                              className="group relative flex flex-col overflow-hidden rounded-lg border border-border bg-card text-left shadow-sm transition-all hover:shadow-md"
                              data-tour={
                                index === 0
                                  ? "creator-portfolio-card"
                                  : undefined
                              }
                            >
                              <div
                                className="relative aspect-video overflow-hidden bg-muted w-full rounded-t-lg group"
                                onMouseEnter={(e) => {
                                  const vid =
                                    e.currentTarget.querySelector("video");
                                  if (vid) vid.setAttribute("controls", "true");
                                }}
                                onMouseLeave={(e) => {
                                  const vid =
                                    e.currentTarget.querySelector("video");
                                  if (vid) vid.removeAttribute("controls");
                                }}
                              >
                                <video
                                  className="absolute inset-0 h-full w-full object-cover"
                                  src={v.videoUrl}
                                  poster={v.thumbnailUrl ?? undefined}
                                  preload="metadata"
                                  playsInline
                                  ref={updateDuration}
                                  onLoadedMetadata={(e) =>
                                    updateDuration(e.currentTarget)
                                  }
                                  onDurationChange={(e) =>
                                    updateDuration(e.currentTarget)
                                  }
                                />

                                <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/10 transition-opacity duration-300 group-hover:opacity-0">
                                  <span className="flex size-10 items-center justify-center rounded-full bg-white/20 shadow-sm backdrop-blur-md">
                                    <Play
                                      className="ml-0.5 size-4 text-white"
                                      aria-hidden
                                    />
                                  </span>
                                </div>

                                <span className="duration-pill pointer-events-none absolute right-2 top-2 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-medium text-white backdrop-blur-sm transition-opacity duration-300 group-hover:opacity-0">
                                  0:00
                                </span>
                              </div>

                              <div className="p-4 flex flex-col gap-3 flex-1">
                                <div className="flex flex-col gap-2 mt-auto">
                                  <div className="flex items-center gap-2 mt-auto">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="shrink-0 h-8 w-8 text-muted-foreground bg-transparent hover:bg-muted/50 hover:text-foreground"
                                      onClick={() => setAssignVideoId(v.id)}
                                      title="Add to section"
                                    >
                                      <FolderPlus className="size-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="shrink-0 h-8 w-8 text-destructive bg-transparent hover:bg-destructive/10 hover:text-destructive"
                                      disabled={
                                        deletingId === v.id || !canDeleteVideos
                                      }
                                      onClick={() => void handleDelete(v)}
                                      title={
                                        canDeleteVideos
                                          ? "Delete video"
                                          : `Your portfolio must keep at least ${MIN_PORTFOLIO_VIDEOS} videos — replace one instead of deleting.`
                                      }
                                    >
                                      {deletingId === v.id ? (
                                        <Spinner className="size-4" />
                                      ) : (
                                        <Trash2 className="size-4" />
                                      )}
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  )}
                  {displayedVideos.length > visibleCount && (
                    <div className="pt-4 flex justify-center pb-8">
                      <Button
                        variant="outline"
                        className="bg-background min-w-[140px]"
                        onClick={() => setVisibleCount((prev) => prev + 6)}
                      >
                        Load More
                      </Button>
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>

        <div className="w-full xl:w-[320px] 2xl:w-[340px] shrink-0 space-y-6">
          <div
            className="rounded-lg border border-border bg-background p-5"
            data-tour="creator-portfolio-boost"
          >
            <div className="flex items-center gap-2 mb-3">
              <Zap className="size-4 text-amber-500 fill-amber-500" />
              <h3 className="font-semibold text-sm text-foreground">
                Boost your visibility
              </h3>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed mb-5">
              Creators with 10+ portfolio pieces get 3x more orders.
            </p>
            <div className="space-y-2.5 mb-5">
              <div className="text-[11px] font-medium text-foreground">
                {videos.length} / 10 uploaded
              </div>
              <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.min((videos.length / 10) * 100, 100)}%`,
                  }}
                />
              </div>
            </div>
            <Button
              variant="outline"
              className="w-full text-primary border-primary/20 bg-background hover:bg-primary/5 hover:text-primary gap-2"
              onClick={() => setIsSourceSheetOpen(true)}
            >
              <Plus className="size-4" />
              Add More
            </Button>
            <Dialog
              open={isUploadOverlayOpen}
              onOpenChange={setIsUploadOverlayOpen}
            >
              <DialogContent className="w-[94vw] max-w-[94vw] sm:w-[70vw] sm:max-w-[70vw] max-h-[90vh] overflow-y-auto">
                <DialogTitle className="sr-only">Add New Work</DialogTitle>
                <CreatorPortfolioUploadForm
                  isOverlay
                  onSuccess={() => setIsUploadOverlayOpen(false)}
                />
              </DialogContent>
            </Dialog>
          </div>

          <div
            className="rounded-lg border border-border bg-background p-5"
            data-tour="creator-portfolio-tips"
          >
            <h3 className="font-semibold text-sm mb-5">
              Tips to get more orders
            </h3>
            <div className="space-y-4">
              <div className="flex gap-3 items-start">
                <div className="flex shrink-0 size-8 rounded-lg bg-primary/10 items-center justify-center text-primary">
                  <Sparkles className="size-4" />
                </div>
                <div className="pt-0.5">
                  <p className="text-sm font-semibold leading-tight">
                    Add diverse content
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Show different styles and niches
                  </p>
                </div>
              </div>
              <div className="flex gap-3 items-start">
                <div className="flex shrink-0 size-8 rounded-lg bg-primary/10 items-center justify-center text-primary">
                  <CheckCircle2 className="size-4" />
                </div>
                <div className="pt-0.5">
                  <p className="text-sm font-semibold leading-tight">
                    Keep it high quality
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Clear video and good lighting
                  </p>
                </div>
              </div>
              <div className="flex gap-3 items-start">
                <div className="flex shrink-0 size-8 rounded-lg bg-primary/10 items-center justify-center text-primary">
                  <ImageIcon className="size-4" />
                </div>
                <div className="pt-0.5">
                  <p className="text-sm font-semibold leading-tight">
                    Add strong thumbnails
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    It helps grab attention
                  </p>
                </div>
              </div>
              <div className="flex gap-3 items-start">
                <div className="flex shrink-0 size-8 rounded-lg bg-primary/10 items-center justify-center text-primary">
                  <Layout className="size-4" />
                </div>
                <div className="pt-0.5">
                  <p className="text-sm font-semibold leading-tight">
                    Organize with sections
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Make it easy for brands to find you
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-border bg-background p-5">
            <h3 className="font-semibold text-sm mb-3">
              Your public portfolio link
            </h3>
            <div className="flex items-center gap-2 mb-3">
              <div className="flex-1 bg-muted rounded-lg px-3 py-2 text-xs font-medium text-primary truncate border border-border/50">
                {publicProfileDisplayUrl ??
                  "Set your display name to get a link"}
              </div>
              <TooltipProvider delayDuration={150}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span tabIndex={canSharePublicProfile ? undefined : 0}>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="shrink-0 size-9 bg-primary/5 border-primary/20 text-primary hover:bg-primary/10 hover:text-primary disabled:pointer-events-none"
                        onClick={() => void handleCopyPublicProfileLink()}
                        disabled={!canSharePublicProfile}
                        aria-label="Copy public profile link"
                      >
                        <Copy className="size-4" />
                      </Button>
                    </span>
                  </TooltipTrigger>
                  {!canSharePublicProfile && (
                    <TooltipContent>
                      Available once your profile is approved
                    </TooltipContent>
                  )}
                </Tooltip>
              </TooltipProvider>
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              {canSharePublicProfile
                ? "Share your link with brands to get more collaboration opportunities."
                : "Your public profile link becomes shareable once your profile is approved."}
            </p>
          </div>
        </div>
      </div>
      <AddReelSourceSheet
        open={isSourceSheetOpen}
        onOpenChange={setIsSourceSheetOpen}
        instagramState={instagramChooserState}
        onUploadFromDevice={() => {
          setIsSourceSheetOpen(false);
          setIsUploadOverlayOpen(true);
        }}
        onChooseFromInstagram={() => {
          setIsSourceSheetOpen(false);
          setIsReelGalleryOpen(true);
        }}
        onConnectInstagram={() => {
          setIsSourceSheetOpen(false);
          void startInstagramConnect();
        }}
        connecting={connectingInstagram}
      />

      <InstagramReelGallery
        open={isReelGalleryOpen}
        onOpenChange={setIsReelGalleryOpen}
      />

      <ManageSectionsModal
        open={isManageSectionsOpen}
        onOpenChange={setIsManageSectionsOpen}
      />
      <VideoSectionAssignmentModal
        videoId={assignVideoId}
        onClose={() => setAssignVideoId(null)}
      />
    </div>
  );
}
