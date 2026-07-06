"use client";

import Link from "next/link";
import { Calendar, FileText, Video, ClipboardCopy, ArrowRight } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import type { Brief } from "@/features/briefs/api/types";
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
  onAttachBrief?: (brief: Brief) => void;
  isAttaching?: boolean;
}

export function BriefCard({ brief, onAttachBrief, isAttaching }: BriefCardProps) {
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
        <div style={{ display: "flex", gap: "8px" }}>
          <Link
            href={`/brand/briefs/${brief.id}`}
            target="_blank"
            className={styles.useTemplateBtn}
            style={{ textDecoration: "none", display: "flex", gap: "6px", backgroundColor: "transparent", color: "inherit", border: "1px solid var(--border)" }}
          >
            View
            <ArrowRight size={14} />
          </Link>
          {onAttachBrief && (
            <button
              type="button"
              className={styles.useTemplateBtn}
              onClick={() => onAttachBrief(brief)}
              disabled={isAttaching}
            >
              {isAttaching ? (
                <Spinner className="mr-1 size-3" />
              ) : (
                <ClipboardCopy size={14} />
              )}
              Attach
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
