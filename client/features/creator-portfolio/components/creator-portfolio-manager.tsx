"use client";

import { useCallback, useState, useMemo } from "react";
import { isAxiosError } from "axios";
import {
  Image as ImageIcon,
  Play,
  Plus,
  Trash2,
  ExternalLink,
  Settings,
  // Search,
  // LayoutGrid,
  // List,
  // Info,
  Sparkles,
  CheckCircle2,
  Layout,
  Copy,
  MoreHorizontal,
  // Globe,
  // Lock,
  X,
  // Video,
  // FileText,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/dashboard/page-header";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
// import {
//   Tooltip,
//   TooltipContent,
//   TooltipTrigger,
//   TooltipProvider,
// } from "@/components/ui/tooltip";
// import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
  DialogTitle,
} from "@/components/ui/dialog";
import { CreatorPortfolioUploadForm } from "./creator-portfolio-upload-form.lazy";
import type { PortfolioVideoApi } from "../api/types";
import { useDeletePortfolioVideoMutation } from "../hooks/use-delete-portfolio-video-mutation";
import { useMyPortfolioVideosQuery } from "../hooks/use-my-portfolio-videos-query";
// import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Doughnut } from "react-chartjs-2";
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
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showBanner, setShowBanner] = useState(true);
  const [activeTab, setActiveTab] = useState("all");
  // const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [selectedCategory, setSelectedCategory] = useState("all-categories");
  const [selectedSort, setSelectedSort] = useState("newest");

  const deletePortfolioVideoMutation = useDeletePortfolioVideoMutation();
  const videosQuery = useMyPortfolioVideosQuery({
    staleTime: 5 * 60_000,
  });

  const videos = videosQuery.data ?? [];
  const loading = videosQuery.isPending;

  const availableCategories = useMemo(() => {
    const categories = new Set<string>();
    videos.forEach((v) => {
      if (v.industryLabel) categories.add(v.industryLabel.trim());
      if (v.tags) {
        v.tags.forEach((tag) => categories.add(tag.trim()));
      }
    });
    return Array.from(categories).sort((a, b) => a.localeCompare(b));
  }, [videos]);

  const topCategoriesData = useMemo(() => {
    const counts: Record<string, number> = {};
    videos.forEach((v) => {
      if (v.industryLabel) {
        const cat = v.industryLabel.trim();
        counts[cat] = (counts[cat] || 0) + 1;
      }
      if (v.tags) {
        v.tags.forEach((tag) => {
          const cat = tag.trim();
          counts[cat] = (counts[cat] || 0) + 1;
        });
      }
    });

    const sorted = Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    const topSum = sorted.reduce((sum, [, count]) => sum + count, 0);
    const colors = ["#3b82f6", "#fbbf24", "#10b981", "#ec4899", "#8b5cf6"];

    return sorted.map(([name, count], index) => ({
      name,
      count,
      percentage: topSum > 0 ? Math.round((count / topSum) * 100) : 0,
      color: colors[index % colors.length],
    }));
  }, [videos]);

  const displayedVideos = useMemo(() => {
    let filtered = [...videos];

    if (selectedCategory !== "all-categories") {
      filtered = filtered.filter((v) => {
        const matchesIndustry = v.industryLabel?.trim() === selectedCategory;
        const matchesTag = v.tags?.some(
          (tag) => tag.trim() === selectedCategory,
        );
        return matchesIndustry || matchesTag;
      });
    }

    filtered.sort((a, b) => {
      const timeA = new Date(a.createdAt).getTime();
      const timeB = new Date(b.createdAt).getTime();
      if (selectedSort === "newest") return timeB - timeA;
      if (selectedSort === "oldest") return timeA - timeB;
      return 0;
    });

    return filtered;
  }, [videos, selectedCategory, selectedSort]);

  const handleDelete = useCallback(
    async (video: PortfolioVideoApi) => {
      const label = video.description?.trim() || "this video";
      if (
        !window.confirm(
          `Remove "${label}" from your portfolio? This cannot be undone.`,
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
    [deletePortfolioVideoMutation],
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
    <div className="space-y-6">
      <div className="flex flex-col xl:flex-row gap-8 items-start">
        <div className="flex-1 w-full space-y-6 min-w-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-2">
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
              {/* <button
                onClick={() => setActiveTab("videos")}
                className={`flex items-center gap-2 pb-2 border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === "videos"
                    ? "border-primary text-primary font-semibold"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                Videos
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full ${activeTab === "videos" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}
                >
                  {staticCounts.videos}
                </span>
              </button> */}
              {/* <button
                onClick={() => setActiveTab("images")}
                className={`flex items-center gap-2 pb-2 border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === "images"
                    ? "border-primary text-primary font-semibold"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                Images
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full ${activeTab === "images" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}
                >
                  {staticCounts.images}
                </span>
              </button> */}
              {/* <button
                onClick={() => setActiveTab("other")}
                className={`flex items-center gap-2 pb-2 border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === "other"
                    ? "border-primary text-primary font-semibold"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                Other Files
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full ${activeTab === "other" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}
                >
                  {staticCounts.other}
                </span>
              </button> */}
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <Button asChild className="gap-2">
                <Link href="/creator/portfolio/upload">
                  <Plus className="size-4" />
                  Add New Work
                </Link>
              </Button>
              <Button variant="outline" className="gap-2 bg-background">
                <Settings className="size-4" />
                Manage Sections
              </Button>
              <Button variant="outline" className="gap-2 bg-background" asChild>
                <Link href="#">
                  View my public profile <ExternalLink className="size-4" />
                </Link>
              </Button>
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
                    Sections help brands find the type of content they're
                    looking for easily.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0 w-full sm:w-auto">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2 bg-background border-primary/20 text-primary hover:bg-primary/10 hover:text-primary w-full sm:w-auto"
                >
                  <Plus className="size-3.5" />
                  Create Section
                </Button>
                <button
                  onClick={() => setShowBanner(false)}
                  className="text-muted-foreground hover:text-foreground hidden sm:block"
                >
                  <X className="size-5" />
                </button>
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row justify-between gap-4">
            {/* <div className="relative w-full sm:max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Search your works..."
                className="pl-9 bg-background border-border"
              />
            </div> */}
            <div className="flex flex-wrap items-center gap-3">
              <Select
                value={selectedCategory}
                onValueChange={setSelectedCategory}
              >
                <SelectTrigger className="w-[140px] bg-background">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all-categories">All Categories</SelectItem>
                  {availableCategories.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* <Select defaultValue="all-collaborations">
                <SelectTrigger className="w-[160px] bg-background">
                  <SelectValue placeholder="All Collaborations" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all-collaborations">
                    All Collaborations
                  </SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="barter">Barter</SelectItem>
                </SelectContent>
              </Select> */}

              <Select value={selectedSort} onValueChange={setSelectedSort}>
                <SelectTrigger className="w-[130px] bg-background">
                  <SelectValue placeholder="Newest First" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Newest First</SelectItem>
                  <SelectItem value="oldest">Oldest First</SelectItem>
                  {/* <SelectItem value="popular">Most Popular</SelectItem> */}
                </SelectContent>
              </Select>

              {/* <div className="flex items-center gap-1 bg-background border border-border rounded-lg p-1 ml-auto sm:ml-2">
                <button
                  onClick={() => setViewMode("grid")}
                  className={`p-1.5 rounded-md transition-colors ${viewMode === "grid" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"}`}
                >
                  <LayoutGrid className="size-4" />
                </button>
                <button
                  onClick={() => setViewMode("list")}
                  className={`p-1.5 rounded-md transition-colors ${viewMode === "list" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"}`}
                >
                  <List className="size-4" />
                </button>
              </div> */}
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
                Upload videos to your best UGC content to attract brand deals.
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
                <div className="grid gap-5 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                  {displayedVideos.map((v) => {
                    const cardTitle =
                      v.description?.trim() || "Portfolio video";
                    const createdLabel = new Date(
                      v.createdAt,
                    ).toLocaleDateString(undefined, {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    });
                    const industryName =
                      v.industryLabel?.trim() || "Brand Work";
                    const fallbackInitials = industryName
                      .substring(0, 2)
                      .toUpperCase();
                    const tagDisplay = v.tags?.[0]?.trim() || "UGC Video";

                    const updateDuration = (video: HTMLVideoElement | null) => {
                      if (video && video.duration && isFinite(video.duration)) {
                        const minutes = Math.floor(video.duration / 60);
                        const seconds = Math.floor(video.duration % 60);
                        const formatted = `${minutes}:${seconds.toString().padStart(2, "0")}`;
                        const pill =
                          video.parentElement?.querySelector(".duration-pill");
                        if (pill && pill.textContent !== formatted)
                          pill.textContent = formatted;
                      }
                    };

                    return (
                      <div
                        key={v.id}
                        className="group relative flex flex-col overflow-hidden rounded-lg border border-border bg-card text-left shadow-sm transition-all hover:shadow-md"
                      >
                        <div
                          className="relative aspect-video overflow-hidden bg-muted w-full rounded-t-lg group"
                          onMouseEnter={(e) => {
                            const vid = e.currentTarget.querySelector("video");
                            if (vid) vid.setAttribute("controls", "true");
                          }}
                          onMouseLeave={(e) => {
                            const vid = e.currentTarget.querySelector("video");
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
                            <div className="flex flex-wrap items-center gap-2">
                              {v.industryLabel && (
                                <span className="inline-flex items-center rounded-md bg-blue-50/80 px-2.5 py-1 text-[10px] font-semibold text-blue-700 ring-1 ring-inset ring-blue-700/20 dark:bg-blue-900/30 dark:text-blue-300 dark:ring-blue-800 shadow-sm transition-colors hover:bg-blue-100/80">
                                  {v.industryLabel}
                                </span>
                              )}
                              {v.language && (
                                <span className="inline-flex items-center rounded-md bg-purple-50/80 px-2.5 py-1 text-[10px] font-semibold text-purple-700 ring-1 ring-inset ring-purple-700/20 dark:bg-purple-900/30 dark:text-purple-300 dark:ring-purple-800 shadow-sm transition-colors hover:bg-purple-100/80">
                                  {v.language}
                                </span>
                              )}
                            </div>

                            {v.tags && v.tags.length > 0 && (
                              <div className="flex flex-wrap items-center gap-1.5">
                                {v.tags.map((tag, i) => {
                                  const colors = [
                                    "bg-emerald-50/80 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-900/30 dark:text-emerald-300 dark:ring-emerald-800 hover:bg-emerald-100/80",
                                    "bg-amber-50/80 text-amber-800 ring-amber-600/20 dark:bg-amber-900/30 dark:text-amber-300 dark:ring-amber-800 hover:bg-amber-100/80",
                                    "bg-pink-50/80 text-pink-700 ring-pink-700/20 dark:bg-pink-900/30 dark:text-pink-300 dark:ring-pink-800 hover:bg-pink-100/80",
                                    "bg-indigo-50/80 text-indigo-700 ring-indigo-700/20 dark:bg-indigo-900/30 dark:text-indigo-300 dark:ring-indigo-800 hover:bg-indigo-100/80",
                                  ];
                                  const colorClass = colors[i % colors.length];
                                  return (
                                    <span
                                      key={i}
                                      className={`inline-flex items-center rounded-md px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ring-1 ring-inset shadow-sm transition-colors ${colorClass}`}
                                    >
                                      {tag}
                                    </span>
                                  );
                                })}
                              </div>
                            )}
                          </div>

                          <div className="flex items-center justify-end gap-3 mt-2">
                            <span className="font-medium text-xs text-muted-foreground">
                              {createdLabel}
                            </span>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button
                                  type="button"
                                  className="text-muted-foreground hover:text-foreground transition-colors p-1"
                                  disabled={deletingId === v.id}
                                >
                                  {deletingId === v.id ? (
                                    <Spinner className="size-4" />
                                  ) : (
                                    <MoreHorizontal className="size-4" />
                                  )}
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-40">
                                <DropdownMenuItem
                                  onClick={() => void handleDelete(v)}
                                  className="text-destructive focus:text-destructive focus:bg-destructive/10 cursor-pointer font-medium"
                                >
                                  <Trash2 className="mr-2 size-4" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              <div className="pt-4 flex justify-center pb-8">
                <Button
                  variant="outline"
                  className="bg-background min-w-[140px]"
                >
                  Load More
                </Button>
              </div>
            </>
          )}
        </div>

        <div className="w-full xl:w-[320px] 2xl:w-[340px] shrink-0 space-y-6">
          <div className="rounded-lg border border-border bg-background p-5">
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
            <Dialog
              open={isUploadOverlayOpen}
              onOpenChange={setIsUploadOverlayOpen}
            >
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full text-primary border-primary/20 bg-background hover:bg-primary/5 hover:text-primary gap-2"
                >
                  <Plus className="size-4" />
                  Add More
                </Button>
              </DialogTrigger>
              <DialogContent className="w-[70vw] max-w-[70vw] sm:max-w-[70vw] max-h-[90vh] overflow-y-auto">
                <DialogTitle className="sr-only">Add New Work</DialogTitle>
                <CreatorPortfolioUploadForm
                  isOverlay
                  onSuccess={() => setIsUploadOverlayOpen(false)}
                />
              </DialogContent>
            </Dialog>
          </div>

          <div className="rounded-lg border border-border bg-background p-5">
            <h3 className="font-semibold text-sm mb-6">Top Categories</h3>
            {topCategoriesData.length > 0 ? (
              <div className="flex items-center gap-6 mb-6">
                <div className="relative shrink-0">
                  <div className="size-[100px]">
                    <Doughnut
                      data={{
                        labels: topCategoriesData.map((d) => d.name),
                        datasets: [
                          {
                            data: topCategoriesData.map((d) => d.count),
                            backgroundColor: topCategoriesData.map(
                              (d) => d.color,
                            ),
                            borderWidth: 0,
                            hoverOffset: 4,
                          },
                        ],
                      }}
                      options={{
                        cutout: "72%",
                        plugins: {
                          legend: { display: false },
                          tooltip: { enabled: true },
                        },
                        maintainAspectRatio: false,
                      }}
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-2.5 w-full">
                  {topCategoriesData.map((item) => (
                    <div
                      key={item.name}
                      className="flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className="size-2 rounded-full"
                          style={{ backgroundColor: item.color }}
                        ></span>
                        <span
                          className="text-muted-foreground line-clamp-1"
                          title={item.name}
                        >
                          {item.name}
                        </span>
                      </div>
                      <span className="font-medium">{item.percentage}%</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-[100px] text-muted-foreground text-xs bg-muted/20 rounded-lg mb-6 border border-dashed border-border/50">
                No categories yet
              </div>
            )}
            <Link
              href="#"
              className="text-xs font-semibold text-primary hover:underline flex items-center justify-center mt-2"
            >
              Manage Categories &gt;
            </Link>
          </div>

          <div className="rounded-lg border border-border bg-background p-5">
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
            {/* <Link href="#" className="text-xs font-semibold text-primary hover:underline flex items-center justify-center mt-6">
              View Portfolio Guide &gt;
            </Link> */}
          </div>

          <div className="rounded-lg border border-border bg-background p-5">
            <h3 className="font-semibold text-sm mb-3">
              Your public portfolio link
            </h3>
            <div className="flex items-center gap-2 mb-3">
              <div className="flex-1 bg-muted rounded-lg px-3 py-2 text-xs font-medium text-primary truncate border border-border/50">
                letscollab.com/@riyasharma
              </div>
              <Button
                variant="outline"
                size="icon"
                className="shrink-0 size-9 bg-primary/5 border-primary/20 text-primary hover:bg-primary/10 hover:text-primary"
              >
                <Copy className="size-4" />
              </Button>
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Share your link with brands to get more collaboration
              opportunities.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
