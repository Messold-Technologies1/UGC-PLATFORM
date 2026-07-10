"use client";

import { useEffect, useMemo, useState } from "react";
import ISO6391 from "iso-639-1";
import ReactSelect from "react-select";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
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
  capitalizeFirstLetter,
  toTitleCaseLabel,
  splitCommaSeparatedList,
  toggleCommaSeparatedItem,
} from "@/lib/string-lists";
import { useUpdatePortfolioVideoMutation } from "../hooks/use-update-portfolio-video-mutation";
import { 
  usePortfolioTagSuggestionsQuery,
  usePortfolioIndustrySuggestionsQuery,
} from "../hooks/use-portfolio-suggestion-queries";
import type { PortfolioVideoApi } from "../api/types";
import { type UpdatePortfolioVideoPayload } from "../api/update-portfolio-video";

function parseTags(raw: string): string[] {
  return [...new Set(splitCommaSeparatedList(raw))];
}

export function CreatorPortfolioTagsModal({
  video,
  open,
  onOpenChange,
}: {
  video: PortfolioVideoApi | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const updateMutation = useUpdatePortfolioVideoMutation();
  const submitting = updateMutation.isPending;

  const tagSuggestionsQuery = usePortfolioTagSuggestionsQuery({
    staleTime: 5 * 60_000,
  });
  const industrySuggestionsQuery = usePortfolioIndustrySuggestionsQuery({
    staleTime: 5 * 60_000,
  });
  const industrySuggestions = useMemo(
    () =>
      (industrySuggestionsQuery.data ?? []).map((name) =>
        toTitleCaseLabel(name),
      ),
    [industrySuggestionsQuery.data],
  );
  const tagSuggestions = useMemo(
    () =>
      (tagSuggestionsQuery.data ?? []).map((name) => capitalizeFirstLetter(name)),
    [tagSuggestionsQuery.data],
  );

  const [description, setDescription] = useState("");
  const [industryLabel, setIndustryLabel] = useState("");
  const [language, setLanguage] = useState("");
  const [tagsRaw, setTagsRaw] = useState("");
  const [visibility, setVisibility] = useState<"public" | "private">("public");

  useEffect(() => {
    if (open && video) {
      setDescription(video.description || "");
      setIndustryLabel(toTitleCaseLabel(video.industryLabel || ""));
      setLanguage(video.language || "");
      setTagsRaw(video.tags ? video.tags.join(", ") : "");
      setVisibility(video.visibilityStatus || "public");
    }
  }, [open, video]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!video) return;

    const tags = parseTags(tagsRaw).map((tag) => capitalizeFirstLetter(tag));
    const payload: UpdatePortfolioVideoPayload = {
      description: description.trim(),
      industryLabel: toTitleCaseLabel(industryLabel.trim()),
      language: language.trim(),
      tags,
      visibilityStatus: visibility,
    };

    updateMutation.mutate(
      {
        videoId: video.id,
        payload,
      },
      {
        onSuccess: () => {
          onOpenChange(false);
        },
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Video Metadata</DialogTitle>
        </DialogHeader>
        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4 pt-4">
          
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
              {industrySuggestions.length > 0 ? (
                <datalist id="portfolio-industry-suggestions">
                  {industrySuggestions.map((name) => (
                    <option key={name} value={name} />
                  ))}
                </datalist>
              ) : null}
              {industrySuggestions.length > 0 ? (
                <SuggestionChips
                  items={industrySuggestions.map((name) => ({
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
            <Label htmlFor="portfolio-edit-tags">Tags</Label>
            <Input
              id="portfolio-edit-tags"
              value={tagsRaw}
              disabled={submitting}
              onChange={(e) => setTagsRaw(e.target.value)}
              placeholder="Comma-separated, e.g. testimonial, UGC"
            />
            {tagSuggestions.length > 0 ? (
              <SuggestionChips
                items={tagSuggestions.map((name) => ({
                  key: name,
                  label: name,
                  ariaLabel: `Add ${name} to tags`,
                }))}
                disabled={submitting}
                selectedLabels={parseTags(tagsRaw)}
                onSelect={(name) =>
                  setTagsRaw((prev) => toggleCommaSeparatedItem(prev, name))
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

          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              disabled={submitting}
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? (
                <>
                  <Spinner className="mr-2 size-4" aria-hidden />
                  Saving...
                </>
              ) : (
                "Save changes"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
