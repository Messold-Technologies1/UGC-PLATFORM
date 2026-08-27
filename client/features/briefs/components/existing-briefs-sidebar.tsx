"use client";

import { useState } from "react";
import { LayoutGrid, AlertCircle, FileText, Menu, X } from "lucide-react";
import { useListBriefsQuery } from "@/features/briefs/hooks/use-list-briefs-query";
import { BriefCard } from "@/features/briefs/components/brief-card";
import type { Brief } from "@/features/briefs/api/types";
import {
  Drawer,
  DrawerContent,
  DrawerTrigger,
  DrawerClose,
  DrawerTitle,
} from "@/components/ui/drawer";
import styles from "./brief-studio.module.css";

interface ExistingBriefsSidebarProps {
  onSubmitBrief: (brief: Brief) => void;
}

export function ExistingBriefsSidebar({
  onSubmitBrief,
}: ExistingBriefsSidebarProps) {
  const { data, isLoading, isError } = useListBriefsQuery({
    staleTime: 2 * 60_000,
  });
  const briefs = data?.items ?? [];

  return (
    <section className={`${styles.panel} ${styles.rightPanel}`}>
      <BriefsPanelContent
        briefs={briefs}
        isLoading={isLoading}
        isError={isError}
        onSubmitBrief={onSubmitBrief}
      />
    </section>
  );
}

export function BriefsDrawerButton({
  onSubmitBrief,
}: ExistingBriefsSidebarProps) {
  const { data, isLoading, isError } = useListBriefsQuery({
    staleTime: 2 * 60_000,
  });
  const briefs = data?.items ?? [];
  const [open, setOpen] = useState(false);

  const handleSubmitBrief = (brief: Brief) => {
    onSubmitBrief(brief);
    setOpen(false);
  };

  return (
    <Drawer open={open} onOpenChange={setOpen} direction="right">
      <DrawerTrigger asChild>
        <button
          type="button"
          className={styles.briefsMenuBtn}
          aria-label="Browse your briefs"
        >
          <Menu size={18} />
          {briefs.length > 0 && (
            <span className={styles.briefsMenuBtnBadge}>{briefs.length}</span>
          )}
        </button>
      </DrawerTrigger>
      <DrawerContent
        className={`${styles.briefsDrawer} w-[88%]! max-w-[360px]! bg-white p-0 flex flex-col`}
      >
        <DrawerTitle className="sr-only">Your briefs</DrawerTitle>
        <BriefsPanelContent
          briefs={briefs}
          isLoading={isLoading}
          isError={isError}
          onSubmitBrief={handleSubmitBrief}
          renderClose
        />
      </DrawerContent>
    </Drawer>
  );
}

interface BriefsPanelContentProps {
  briefs: Brief[];
  isLoading: boolean;
  isError: boolean;
  onSubmitBrief: (brief: Brief) => void;
  renderClose?: boolean;
}

function BriefsPanelContent({
  briefs,
  isLoading,
  isError,
  onSubmitBrief,
  renderClose = false,
}: BriefsPanelContentProps) {
  return (
    <>
      <div className={styles.panelHead}>
        <div className={styles.panelHeadIconGrape}>
          <LayoutGrid size={19} />
        </div>
        <div>
          <h2 className={styles.panelHeadTitle}>Your briefs</h2>
          <div className={styles.panelHeadSub}>
            Submit a saved brief to your orders
          </div>
        </div>
        <span className={styles.panelHeadCount}>{briefs.length}</span>
        {renderClose && (
          <DrawerClose asChild>
            <button
              type="button"
              className={styles.briefsDrawerClose}
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </DrawerClose>
        )}
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
                onSubmitBrief={onSubmitBrief}
              />
            ))}
          </div>
        )}
      </div>
    </>
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
