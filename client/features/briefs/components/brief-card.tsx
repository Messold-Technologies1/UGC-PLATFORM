"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Calendar,
  Eye,
  FileText,
  MoreVertical,
  Pencil,
  Send,
  Trash2,
  Video,
  ArrowRight,
} from "lucide-react";
import type { Brief } from "@/features/briefs/api/types";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
import { useDeleteBriefMutation } from "@/features/briefs/hooks/use-delete-brief-mutation";
import styles from "./brief-studio.module.css";
import { formatContentType, formatDuration, formatTone } from "../lib/format-enums";

const CATEGORY_COLORS: Record<string, string> = {
  beauty: "#be185d",
  skincare: "#15803d",
  fashion: "#5b21b6",
  fitness: "#c2410c",
  "food & bev": "#a16207",
  "tech & gadgets": "#0369a1",
  "home & decor": "#0f766e",
  parenting: "#a21caf",
  travel: "#0e7490",
  wellness: "#15803d",
  gaming: "#7e22ce",
  finance: "#334155",
};

function categoryColor(industry: string | null | undefined): string {
  if (!industry) return "#475569";
  return CATEGORY_COLORS[industry.toLowerCase()] ?? "#475569";
}

function formatRelativeDate(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks}w ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

interface BriefCardProps {
  brief: Brief;
  mode?: "submit" | "link";
  onSubmitBrief?: (brief: Brief) => void;
}

export function BriefCard({ brief, mode = "submit", onSubmitBrief }: BriefCardProps) {
  const router = useRouter();
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  const deleteMutation = useDeleteBriefMutation({
    onSuccess: () => setIsDeleteOpen(false),
  });
  const isDeleting = deleteMutation.isPending;

  const editHref = `/brand/briefs/create?briefId=${brief.id}`;

  const color = categoryColor(brief.industry);
  const contentLabel =
    brief.contentType.length > 0 ? formatContentType(brief.contentType[0]) : "Brief";
  const durationLabel = brief.durationBucket ? formatDuration(brief.durationBucket) : null;
  const toneLabel =
    brief.toneStyle.length > 0 ? formatTone(brief.toneStyle[0]) : null;

  return (
    <article className={styles.briefCard}>
      <div className={styles.briefTop}>
        <div
          className={styles.briefIcon}
          style={{
            background: `linear-gradient(135deg, ${color}, color-mix(in oklab, ${color} 55%, #000))`,
          }}
        >
          <FileText size={19} />
        </div>
        <div className={styles.briefHeader}>
          <div className={styles.briefName}>
            {brief.productName || "Untitled Brief"}
          </div>
          <div className={styles.briefCat}>
            <span
              className={styles.briefSwatch}
              style={{ background: color }}
            />
            {brief.brandName ?? "Brand"} · {contentLabel}
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className={styles.briefMenuBtn}
              aria-label="Brief options"
            >
              <MoreVertical size={16} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem onClick={() => router.push(`/brand/briefs/${brief.id}`)}>
              <Eye size={14} />
              View brief
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push(editHref)}>
              <Pencil size={14} />
              Edit brief
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              onClick={() => setIsDeleteOpen(true)}
            >
              <Trash2 size={14} />
              Delete brief
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className={styles.briefMeta}>
        <span className={styles.briefMetaBadge}>
          <Video size={13} />
          {contentLabel}
        </span>
        {durationLabel && (
          <span className={styles.briefMetaBadge}>{durationLabel}</span>
        )}
        {toneLabel && (
          <span className={styles.briefMetaBadge}>{toneLabel}</span>
        )}
      </div>

      <div className={styles.briefFoot}>
        <span className={styles.briefDate}>
          <Calendar size={13} />
          {formatRelativeDate(brief.createdAt)}
        </span>
        {mode === "submit" ? (
          <div className={styles.briefFootActions}>
            <Link
              href={`/brand/briefs/${brief.id}`}
              className={styles.viewBriefBtn}
              style={{ textDecoration: "none" }}
            >
              <Eye size={14} />
              View
            </Link>
            <button
              type="button"
              className={styles.useTemplateBtn}
              onClick={() => onSubmitBrief?.(brief)}
            >
              <Send size={14} />
              Submit this brief
            </button>
          </div>
        ) : (
          <Link
            href={`/brand/briefs/${brief.id}`}
            className={styles.useTemplateBtn}
            style={{ textDecoration: "none", display: "flex", gap: "6px" }}
          >
            View Brief
            <ArrowRight size={14} />
          </Link>
        )}
      </div>

      <Dialog
        open={isDeleteOpen}
        onOpenChange={(open) => {
          if (isDeleting) return;
          setIsDeleteOpen(open);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete this brief?</DialogTitle>
            <DialogDescription>
              &ldquo;{brief.productName || "Untitled Brief"}&rdquo; will be
              permanently deleted. This cannot be undone. Briefs already
              attached to an order can&rsquo;t be deleted.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDeleteOpen(false)}
              disabled={isDeleting}
              className="rounded-xl"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteMutation.mutate(brief.id)}
              disabled={isDeleting}
              className="rounded-xl font-bold"
            >
              {isDeleting ? (
                <>
                  <Spinner className="mr-2 size-4" aria-hidden />
                  Deleting…
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 size-4" />
                  Delete brief
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </article>
  );
}
