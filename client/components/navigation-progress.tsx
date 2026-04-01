"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

function isPlainLeftClick(event: MouseEvent) {
  return (
    event.button === 0 &&
    !event.metaKey &&
    !event.ctrlKey &&
    !event.shiftKey &&
    !event.altKey
  );
}

function shouldTrackAnchor(anchor: HTMLAnchorElement) {
  const href = anchor.getAttribute("href");
  if (!href || href.startsWith("#")) return false;
  if (anchor.target && anchor.target !== "_self") return false;
  if (anchor.hasAttribute("download")) return false;

  const url = new URL(anchor.href, window.location.href);
  if (url.origin !== window.location.origin) return false;

  const current = new URL(window.location.href);
  return `${url.pathname}${url.search}` !== `${current.pathname}${current.search}`;
}

export function NavigationProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [visible, setVisible] = useState(false);
  const [progress, setProgress] = useState(0);
  const intervalRef = useRef<number | null>(null);
  const finishTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    const clearTimers = () => {
      if (intervalRef.current != null) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if (finishTimeoutRef.current != null) {
        window.clearTimeout(finishTimeoutRef.current);
        finishTimeoutRef.current = null;
      }
    };

    const start = () => {
      clearTimers();
      setVisible(true);
      setProgress((current) => (current > 0.15 ? current : 0.15));
      intervalRef.current = window.setInterval(() => {
        setProgress((current) => {
          if (current >= 0.9) return current;
          const next = current + (1 - current) * 0.12;
          return Math.min(0.9, next);
        });
      }, 120);
    };

    const finish = () => {
      clearTimers();
      setVisible(true);
      setProgress(1);
      finishTimeoutRef.current = window.setTimeout(() => {
        setVisible(false);
        setProgress(0);
      }, 180);
    };

    const handleClick = (event: MouseEvent) => {
      if (!isPlainLeftClick(event)) return;
      const target = event.target;
      if (!(target instanceof Node)) return;
      const anchor = target instanceof HTMLAnchorElement ? target : target.parentElement?.closest("a");
      if (!(anchor instanceof HTMLAnchorElement)) return;
      if (!shouldTrackAnchor(anchor)) return;
      start();
    };

    const handlePopState = () => {
      start();
    };

    document.addEventListener("click", handleClick, true);
    window.addEventListener("popstate", handlePopState);
    finish();

    return () => {
      document.removeEventListener("click", handleClick, true);
      window.removeEventListener("popstate", handlePopState);
      clearTimers();
    };
  }, [pathname, searchParams]);

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-x-0 top-0 z-250 h-1"
    >
      <div
        className="h-full origin-left bg-foreground/85 shadow-[0_0_18px_rgba(0,0,0,0.18)] transition-[transform,opacity] duration-200 ease-out"
        style={{
          opacity: visible ? 1 : 0,
          transform: `scaleX(${progress})`,
        }}
      />
    </div>
  );
}
