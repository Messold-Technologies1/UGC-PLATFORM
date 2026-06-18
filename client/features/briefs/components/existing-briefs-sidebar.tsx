"use client";

import { LayoutGrid, AlertCircle, FileText } from "lucide-react";
import { useListBriefsQuery } from "@/features/briefs/hooks/use-list-briefs-query";
import { BriefCard } from "@/features/briefs/components/brief-card";
import type { Brief } from "@/features/briefs/api/types";
import styles from "./brief-studio.module.css";

interface ExistingBriefsSidebarProps {
  onUseTemplate: (brief: Brief) => void;
}

export function ExistingBriefsSidebar({
  onUseTemplate,
}: ExistingBriefsSidebarProps) {
  const { data, isLoading, isError } = useListBriefsQuery({
    staleTime: 2 * 60_000,
  });
  const briefs = data?.items ?? [];

  return (
    <section className={`${styles.panel} ${styles.rightPanel}`}>
      
      <div className={styles.panelHead}>
        <div className={styles.panelHeadIconGrape}>
          <LayoutGrid size={19} />
        </div>
        <div>
          <h2 className={styles.panelHeadTitle}>Your briefs</h2>
          <div className={styles.panelHeadSub}>
            Reuse a template to start faster
          </div>
        </div>
        <span className={styles.panelHeadCount}>{briefs.length}</span>
      </div>

      <div className={styles.panelBody}>

        {isLoading ? (
          <LoadingSkeleton />
        ) : isError ? (
          <div className={styles.briefEmpty}>
            <AlertCircle
              size={24}
              style={{ margin: "0 auto 8px", opacity: 0.5 }}
            />
            <p>Unable to load briefs</p>
          </div>
        ) : briefs.length === 0 ? (
          <div className={styles.briefEmpty}>
            <>
              <FileText
                size={24}
                style={{ margin: "0 auto 8px", opacity: 0.4 }}
              />
              <p>No briefs yet. Create your first one on the left!</p>
            </>
          </div>
        ) : (
          <div className={styles.briefList}>
            {briefs.map((brief) => (
              <BriefCard
                key={brief.id}
                brief={brief}
                onUseTemplate={onUseTemplate}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function LoadingSkeleton() {
  return (
    <div className={styles.briefLoading}>
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className={styles.briefSkeleton}>
          <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
            <div className={styles.skeletonCircle} />
            <div style={{ flex: 1 }}>
              <div className={styles.skeletonLineMd} />
              <div className={styles.skeletonLineSm} />
            </div>
          </div>
          <div
            style={{
              display: "flex",
              gap: 7,
              marginTop: 13,
            }}
          >
            <div
              className={styles.skeletonLine}
              style={{ width: 80, height: 22, borderRadius: 7 }}
            />
            <div
              className={styles.skeletonLine}
              style={{ width: 60, height: 22, borderRadius: 7 }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
