"use client";

import Link from "next/link";
import { useState } from "react";
import ISO6391 from "iso-639-1";
import ReactSelect from "react-select";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/dashboard/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SuggestionChips } from "@/components/ui/suggestion-chips";
import {
  splitCommaSeparatedList,
  toggleCommaSeparatedItem,
} from "@/lib/string-lists";
import { useCreatePortfolioVideoFlowMutation } from "../hooks/use-create-portfolio-video-flow-mutation";
import {
  usePortfolioIndustrySuggestionsQuery,
  usePortfolioTagSuggestionsQuery,
} from "../hooks/use-portfolio-suggestion-queries";
import { type UpdatePortfolioVideoPayload } from "../api/update-portfolio-video";

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

export function CreatorPortfolioUploadForm({
  isOverlay = false,
  adminMode = false,
  adminCreatorId,
  onSuccess,
}: {
  isOverlay?: boolean;
  adminMode?: boolean;
  adminCreatorId?: string;
  onSuccess?: () => void;
} = {}) {
  const createPortfolioVideoFlowMutation = useCreatePortfolioVideoFlowMutation();
  const submitting = createPortfolioVideoFlowMutation.isPending;

  const industrySuggestionsQuery = usePortfolioIndustrySuggestionsQuery({
    staleTime: 5 * 60_000,
  });
  const tagSuggestionsQuery = usePortfolioTagSuggestionsQuery({
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

    if (adminMode && !adminCreatorId) {
      toast.error("Missing creator id for admin upload");
      return;
    }

    createPortfolioVideoFlowMutation.mutate(
      {
        videoFile,
        thumbnailFile,
        visibility,
        metadataPatch: buildMetadataPatch({
          description,
          industryLabel,
          language,
          tagsRaw,
        }),
        adminCreatorId: adminMode ? adminCreatorId : undefined,
      },
      {
        onSuccess: () => {
          onSuccess?.();
        },
      },
    );
  }

  return (
    <div className={isOverlay ? "space-y-4" : "space-y-8"}>
      {!isOverlay && (
        <>
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
        </>
      )}

      <Card>
        <CardContent className="pt-6">
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
              <Textarea
                id="portfolio-desc"
                rows={3}
                value={description}
                disabled={submitting}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Short description for brands"
                className="min-h-20 max-h-40 resize-y"
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
                    selectedLabels={industryLabel ? [industryLabel] : []}
                    onSelect={(name, nextSelected) =>
                      setIndustryLabel(nextSelected ? name : "")
                    }
                  />
                ) : null}
              </div>
              <div className="space-y-2">
                <Label htmlFor="portfolio-lang">Language</Label>
                <ReactSelect
                  inputId="portfolio-lang"
                  options={ISO6391.getAllNames().map((name) => ({
                    value: name,
                    label: name,
                  }))}
                  value={language ? { value: language, label: language } : null}
                  onChange={(option) => setLanguage(option?.value || "")}
                  isDisabled={submitting}
                  placeholder="Select a language..."
                  isClearable
                  isSearchable
                  styles={{
                    control: (base) => ({
                      ...base,
                      backgroundColor: "transparent",
                      borderColor: "var(--input)",
                      borderRadius: "calc(var(--radius) - 2px)",
                      minHeight: "36px",
                      boxShadow: "none",
                      "&:hover": {
                        borderColor: "var(--input)",
                      },
                    }),
                    menu: (base) => ({
                      ...base,
                      backgroundColor: "var(--background)",
                      border: "1px solid var(--border)",
                      borderRadius: "calc(var(--radius) - 2px)",
                      zIndex: 9999,
                    }),
                    option: (base, state) => ({
                      ...base,
                      backgroundColor: state.isFocused
                        ? "var(--accent)"
                        : "transparent",
                      color: state.isFocused
                        ? "var(--accent-foreground)"
                        : "var(--popover-foreground)",
                      cursor: "pointer",
                    }),
                    singleValue: (base) => ({
                      ...base,
                      color: "var(--foreground)",
                    }),
                    input: (base) => ({
                      ...base,
                      color: "var(--foreground)",
                    }),
                  }}
                />
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
                  selectedLabels={parseTags(tagsRaw)}
                  onSelect={(name) =>
                    setTagsRaw((prev) =>
                      toggleCommaSeparatedItem(prev, name),
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
                  <Spinner className="size-4" aria-hidden />
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
