"use client";

import { useState, useEffect, useCallback } from "react";

export function useAdminShortcut() {
  const [showAdmin, setShowAdmin] = useState(false);

  const close = useCallback(() => setShowAdmin(false), []);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && showAdmin) {
        e.preventDefault();
        setShowAdmin(false);
        return;
      }
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "k") {
        const target = e.target as HTMLElement | null;
        if (target) {
          const tag = target.tagName;
          if (
            tag === "INPUT" ||
            tag === "TEXTAREA" ||
            tag === "SELECT" ||
            target.isContentEditable
          ) {
            return;
          }
        }

        e.preventDefault();
        setShowAdmin((prev) => !prev);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showAdmin]);

  return { showAdmin, closeAdmin: close } as const;
}
