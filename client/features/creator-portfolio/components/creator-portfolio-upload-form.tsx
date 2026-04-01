"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/dashboard/page-header";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SuggestionChips } from "@/components/ui/suggestion-chips";
import {
  appendUniqueCommaSeparatedItem,
  splitCommaSeparatedList,
} from "@/lib/string-lists";
import { cn } from "@/lib/utils";
import { createPortfolioVideo } from "../api/create-portfolio-video";
import { portfolioMyVideosQueryKey } from "../api/list-my-portfolio-videos";
import {
  fetchPortfolioIndustrySuggestions,
  fetchPortfolioLanguageSuggestions,
  fetchPortfolioTagSuggestions,
  portfolioSuggestionListsQueryKeys,
} from "../api/portfolio-suggestion-lists";
import {
  presignPortfolioUpload,
  putPortfolioFileToPresignedUrl,
} from "../api/presign-portfolio-upload";
import {
  updatePortfolioVideo,
  type UpdatePortfolioVideoPayload,
} from "../api/update-portfolio-video";

function parseTags(raw: string): string[] {
  return [...new Set(splitCommaSeparatedList(raw))];
}

function buildMetadataPatch(input: {
  description: string;
  industryLabel: string;
  language: string;
  tagsRaw: string;
}): UpdatePortfolioVideoPayload | null {
  const description = input.description.trim();
  const industryLabel = input.industryLabel.trim();
  const language = input.language.trim();
  const tags = parseTags(input.tagsRaw);

  const patch: UpdatePortfolioVideoPayload = {};
  if (description) patch.description = description;
  if (industryLabel) patch.industryLabel = industryLabel;
  if (language) patch.language = language;
  if (tags.length) patch.tags = tags;

  return Object.keys(patch).length > 0 ? patch : null;
}

function resolveVideoContentType(file: File): string {
  const ct = file.type?.trim();
  if (ct) return ct;
  const name = file.name.toLowerCase();
  if (name.endsWith(".mp4")) return "video/mp4";
  if (name.endsWith(".mov")) return "video/quicktime";
  if (name.endsWith(".webm")) return "video/webm";
  return "video/mp4";
}

function resolveImageContentType(file: File): string {
  const ct = file.type?.trim();
  if (ct) return ct;
  const name = file.name.toLowerCase();
  if (name.endsWith(".png")) return "image/png";
  if (name.endsWith(".webp")) return "image/webp";
  return "image/jpeg";
}

function errorMessage(err: unknown): string {
  if (isAxiosError(err)) {
    const data = err.response?.data as { message?: string | string[] } | undefined;
    const m = data?.message;
    if (Array.isArray(m)) return m.join(", ");
    if (typeof m === "string") return m;
    return err.message;
  }
  if (err instanceof Error) return err.message;
  return "Something went wrong";
}

export function CreatorPortfolioUploadForm() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [submitting, setSubmitting] = useState(false);

  const industrySuggestionsQuery = useQuery({
    queryKey: portfolioSuggestionListsQueryKeys.industries,
    queryFn: fetchPortfolioIndustrySuggestions,
    staleTime: 5 * 60_000,
  });
  const tagSuggestionsQuery = useQuery({
    queryKey: portfolioSuggestionListsQueryKeys.tags,
    queryFn: fetchPortfolioTagSuggestions,
    staleTime: 5 * 60_000,
  });
  const languageSuggestionsQuery = useQuery({
    queryKey: portfolioSuggestionListsQueryKeys.languages,
    queryFn: fetchPortfolioLanguageSuggestions,
    staleTime: 5 * 60_000,
  });

  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [description, setDescription] = useState("");
  const [industryLabel, setIndustryLabel] = useState("");
  const [language, setLanguage] = useState("");
  const [tagsRaw, setTagsRaw] = useState("");
  const [visibility, setVisibility] = useState<"public" | "private">("public");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!videoFile) {
      toast.error("Choose a video file");
      return;
    }

    setSubmitting(true);
    try {
      const videoContentType = resolveVideoContentType(videoFile);
      const videoPresign = await presignPortfolioUpload({
        kind: "video",
        contentType: videoContentType,
        contentLength: videoFile.size,
      });
      await putPortfolioFileToPresignedUrl(videoFile, videoPresign);

      let thumbnailKey: string | undefined;
      if (thumbnailFile) {
        const thumbContentType = resolveImageContentType(thumbnailFile);
        const thumbPresign = await presignPortfolioUpload({
          kind: "thumbnail",
          contentType: thumbContentType,
          contentLength: thumbnailFile.size,
        });
        await putPortfolioFileToPresignedUrl(thumbnailFile, thumbPresign);
        thumbnailKey = thumbPresign.key;
      }

      const created = await createPortfolioVideo({
        videoKey: videoPresign.key,
        thumbnailKey,
        visibilityStatus: visibility,
      });

      const metaPatch = buildMetadataPatch({
        description,
        industryLabel,
        language,
        tagsRaw,
      });
      if (metaPatch) {
        await updatePortfolioVideo(created.id, metaPatch);
      }

      toast.success("Portfolio video added");
      await queryClient.invalidateQueries({
        queryKey: portfolioMyVideosQueryKey,
      });
      router.push("/creator/portfolio");
    } catch (err) {
      toast.error("Upload failed", { description: errorMessage(err) });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <Link
          href="/creator/portfolio"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" aria-hidden />
          Back to portfolio
        </Link>
      </div>

      <PageHeader
        title="Add portfolio video"
        description="Upload a video and optional thumbnail."
      />

      <Card>
        <CardHeader>
          <CardTitle>Upload</CardTitle>
          <CardDescription>
            Supported video: MP4, QuickTime, WebM. Thumbnail: JPEG, PNG, WebP.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="portfolio-video">Video</Label>
                <Input
                  id="portfolio-video"
                  type="file"
                  accept="video/mp4,video/quicktime,video/webm,.mp4,.mov,.webm"
                  disabled={submitting}
                  onChange={(ev) => {
                    const f = ev.target.files?.[0];
                    setVideoFile(f ?? null);
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="portfolio-thumb">Thumbnail (optional)</Label>
                <Input
                  id="portfolio-thumb"
                  type="file"
                  accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
                  disabled={submitting}
                  onChange={(ev) => {
                    const f = ev.target.files?.[0];
                    setThumbnailFile(f ?? null);
                  }}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="portfolio-desc">Description</Label>
              <textarea
                id="portfolio-desc"
                rows={3}
                value={description}
                disabled={submitting}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Short description for brands"
                className={cn(
                  "border-input focus-visible:border-ring focus-visible:ring-ring/50 min-h-[80px] w-full rounded-lg border bg-transparent px-2.5 py-2 text-sm shadow-none outline-none transition-colors",
                  "focus-visible:ring-3 md:text-sm",
                  "dark:bg-input/30 placeholder:text-muted-foreground disabled:opacity-50",
                )}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="portfolio-industry">Industry</Label>
                <Input
                  id="portfolio-industry"
                  value={industryLabel}
                  disabled={submitting}
                  onChange={(e) => setIndustryLabel(e.target.value)}
                  placeholder="e.g. fitness"
                  list="portfolio-industry-suggestions"
                />
                {industrySuggestionsQuery.isSuccess &&
                industrySuggestionsQuery.data.length > 0 ? (
                  <datalist id="portfolio-industry-suggestions">
                    {industrySuggestionsQuery.data.map((name) => (
                      <option key={name} value={name} />
                    ))}
                  </datalist>
                ) : null}
                {industrySuggestionsQuery.isSuccess &&
                industrySuggestionsQuery.data.length > 0 ? (
                  <SuggestionChips
                    items={industrySuggestionsQuery.data.map((name) => ({
                      key: name,
                      label: name,
                      ariaLabel: `Use ${name} as industry`,
                    }))}
                    disabled={submitting}
                    onSelect={setIndustryLabel}
                  />
                ) : null}
              </div>
              <div className="space-y-2">
                <Label htmlFor="portfolio-lang">Language</Label>
                <Input
                  id="portfolio-lang"
                  value={language}
                  disabled={submitting}
                  onChange={(e) => setLanguage(e.target.value)}
                  placeholder="e.g. English"
                  list="portfolio-language-suggestions"
                />
                {languageSuggestionsQuery.isSuccess &&
                languageSuggestionsQuery.data.length > 0 ? (
                  <datalist id="portfolio-language-suggestions">
                    {languageSuggestionsQuery.data.map((name) => (
                      <option key={name} value={name} />
                    ))}
                  </datalist>
                ) : null}
                {languageSuggestionsQuery.isSuccess &&
                languageSuggestionsQuery.data.length > 0 ? (
                  <SuggestionChips
                    items={languageSuggestionsQuery.data.map((name) => ({
                      key: name,
                      label: name,
                      ariaLabel: `Use ${name} as language`,
                    }))}
                    disabled={submitting}
                    onSelect={setLanguage}
                  />
                ) : null}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="portfolio-tags">Tags</Label>
              <Input
                id="portfolio-tags"
                value={tagsRaw}
                disabled={submitting}
                onChange={(e) => setTagsRaw(e.target.value)}
                placeholder="Comma-separated, e.g. testimonial, UGC"
              />
              {tagSuggestionsQuery.isSuccess &&
              tagSuggestionsQuery.data.length > 0 ? (
                <SuggestionChips
                  items={tagSuggestionsQuery.data.map((name) => ({
                    key: name,
                    label: name,
                    ariaLabel: `Add ${name} to tags`,
                  }))}
                  disabled={submitting}
                  onSelect={(name) =>
                    setTagsRaw((prev) =>
                      appendUniqueCommaSeparatedItem(prev, name),
                    )
                  }
                />
              ) : null}
            </div>

            <div className="space-y-2">
              <Label>Visibility</Label>
              <Select
                value={visibility}
                disabled={submitting}
                onValueChange={(v) => setVisibility(v as "public" | "private")}
              >
                <SelectTrigger className="w-full sm:max-w-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="public">Public</SelectItem>
                  <SelectItem value="private">Private</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              type="submit"
              disabled={submitting || !videoFile}
              className="gap-2 bg-foreground text-background hover:opacity-90"
            >
              {submitting ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Uploading…
                </>
              ) : (
                "Upload and publish"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
