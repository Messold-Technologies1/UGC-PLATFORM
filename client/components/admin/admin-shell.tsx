"use client";

import { useSyncExternalStore } from "react";

import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { cn } from "@/lib/utils";

const COLLAPSED_KEY = "ugc:admin-sidebar-collapsed";

/**
 * The collapsed flag as an external store rather than state seeded in an
 * effect: the server has no localStorage, so seeding during render makes the
 * first client render disagree with the server's HTML, and seeding in an
 * effect trips `react-hooks/set-state-in-effect`. Subscribing also syncs the
 * rail across an admin's open tabs for free.
 */
const listeners = new Set<() => void>();

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  window.addEventListener("storage", onChange);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onChange);
  };
}

function getSnapshot(): boolean {
  try {
    return window.localStorage.getItem(COLLAPSED_KEY) === "1";
  } catch {
    // Private mode or blocked storage — expanded is a fine default.
    return false;
  }
}

/** The server cannot know the preference, so it always renders expanded. */
function getServerSnapshot(): boolean {
  return false;
}

function setCollapsed(next: boolean) {
  try {
    window.localStorage.setItem(COLLAPSED_KEY, next ? "1" : "0");
  } catch {
    // Preference just will not persist; the toggle still works this session.
  }
  for (const listener of listeners) listener();
}

/**
 * Renders the rail and offsets the content by its current width. Both live
 * here because they must never disagree — a mismatch is invisible until a
 * wide table slides under the rail.
 *
 * Collapsing exists for a measured reason. The orders table is
 * `min-w-[1200px]`, and an expanded 240px rail leaves 1118px of content at a
 * 1440px viewport, so its ACTIONS column falls outside the visible area and
 * has to be scrolled to. Collapsing to icons returns 168px, which brings that
 * table back into view on a 1440px screen.
 */
export function AdminShell({ children }: { children: React.ReactNode }) {
  const collapsed = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );

  return (
    <>
      <AdminSidebar
        collapsed={collapsed}
        onToggle={() => setCollapsed(!collapsed)}
      />
      <div
        className={cn(
          "min-w-0 transition-[padding] duration-200",
          collapsed ? "lg:pl-[4.5rem]" : "lg:pl-60",
        )}
      >
        {children}
      </div>
    </>
  );
}
