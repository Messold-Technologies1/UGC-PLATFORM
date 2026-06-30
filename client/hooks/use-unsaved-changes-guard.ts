"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import type { RosyConfirmOptions } from "@/hooks/use-rosy-confirm-dialog";

const DEFAULT_MESSAGE =
  "You've got unsaved edits on your profile. Leave now and they'll disappear — no undo button.";

const DEFAULT_HINT = "Tip: hit Save draft if you want to pick up where you left off.";

type ConfirmFn = (options: RosyConfirmOptions) => Promise<boolean>;

interface UseUnsavedChangesGuardOptions {
  message?: string;
  hint?: string;
  title?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  confirm?: ConfirmFn;
}

/**
 * Warns on tab close / refresh and intercepts same-origin in-app link clicks
 * when the editor has unsaved changes.
 */
export function useUnsavedChangesGuard(
  enabled: boolean,
  options: UseUnsavedChangesGuardOptions = {},
) {
  const router = useRouter();
  const {
    message = DEFAULT_MESSAGE,
    hint = DEFAULT_HINT,
    title = "Hold up — not saved yet",
    confirmLabel = "Leave anyway",
    cancelLabel = "Keep editing",
    confirm,
  } = options;

  useEffect(() => {
    if (!enabled) return;

    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };

    const onDocumentClick = (event: MouseEvent) => {
      if (event.defaultPrevented) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        return;
      }

      const anchor = (event.target as HTMLElement).closest("a");
      if (!anchor) return;

      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#") || anchor.target === "_blank") return;

      let url: URL;
      try {
        url = new URL(href, window.location.href);
      } catch {
        return;
      }

      if (url.origin !== window.location.origin) return;

      const current = window.location;
      if (
        url.pathname === current.pathname &&
        url.search === current.search &&
        url.hash === current.hash
      ) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      const destination = `${url.pathname}${url.search}${url.hash}`;

      void (async () => {
        const askConfirm =
          confirm ??
          ((opts: RosyConfirmOptions) =>
            Promise.resolve(window.confirm(opts.description)));

        const confirmed = await askConfirm({
          title,
          description: message,
          hint,
          confirmLabel,
          cancelLabel,
        });

        if (confirmed) {
          router.push(destination);
        }
      })();
    };

    window.addEventListener("beforeunload", onBeforeUnload);
    document.addEventListener("click", onDocumentClick, true);

    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      document.removeEventListener("click", onDocumentClick, true);
    };
  }, [
    enabled,
    message,
    hint,
    title,
    confirmLabel,
    cancelLabel,
    confirm,
    router,
  ]);
}
