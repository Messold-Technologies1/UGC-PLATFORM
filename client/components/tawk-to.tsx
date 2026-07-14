"use client";

import { useEffect } from "react";

const TAWK_SRC =
  "https://embed.tawk.to/6a2a91011ed8571c315197bc/1jqr4cs64";

type TawkApi = {
  maximize?: () => void;
  toggle?: () => void;
  popup?: () => void;
  showWidget?: () => void;
  onLoad?: () => void;
};

declare global {
  interface Window {
    Tawk_API?: TawkApi;
    Tawk_LoadStart?: Date;
  }
}

let openPending = false;
let retryTimer: ReturnType<typeof globalThis.setInterval> | null = null;

function getApi(): TawkApi | undefined {
  if (typeof globalThis.window === "undefined") return undefined;
  return globalThis.window.Tawk_API;
}

function tryOpenWidget(): boolean {
  const api = getApi();
  if (!api) return false;

  try {
    if (typeof api.showWidget === "function") {
      api.showWidget();
    }
    if (typeof api.maximize === "function") {
      api.maximize();
      return true;
    }
    if (typeof api.popup === "function") {
      api.popup();
      return true;
    }
    if (typeof api.toggle === "function") {
      api.toggle();
      return true;
    }
  } catch {
    return false;
  }

  return false;
}

function flushPendingOpen() {
  if (!openPending) return;
  if (tryOpenWidget()) {
    openPending = false;
    if (retryTimer) {
      globalThis.clearInterval(retryTimer);
      retryTimer = null;
    }
  }
}

function ensureTawkBootstrap() {
  if (typeof globalThis.window === "undefined") return;

  globalThis.window.Tawk_API = globalThis.window.Tawk_API ?? {};
  globalThis.window.Tawk_LoadStart =
    globalThis.window.Tawk_LoadStart ?? new Date();

  const api = globalThis.window.Tawk_API;
  const previousOnLoad = api.onLoad;
  api.onLoad = () => {
    previousOnLoad?.();
    flushPendingOpen();
  };
}

function ensureTawkScript() {
  if (typeof document === "undefined") return;
  if (document.getElementById("tawk-to-script")) return;

  const script = document.createElement("script");
  script.id = "tawk-to-script";
  script.async = true;
  script.src = TAWK_SRC;
  script.charset = "UTF-8";
  script.crossOrigin = "anonymous";
  document.body.appendChild(script);
}

/**
 * @see https://developer.tawk.to/jsapi/
 */
export function TawkToChat() {
  useEffect(() => {
    ensureTawkBootstrap();
    ensureTawkScript();
  }, []);

  return null;
}

export function openSupportChat() {
  if (typeof globalThis.window === "undefined") return;

  ensureTawkBootstrap();
  ensureTawkScript();

  if (tryOpenWidget()) return;

  openPending = true;

  if (retryTimer) {
    globalThis.clearInterval(retryTimer);
  }

  let attempts = 0;
  retryTimer = globalThis.setInterval(() => {
    attempts += 1;
    flushPendingOpen();
    if (!openPending || attempts >= 40) {
      if (retryTimer) {
        globalThis.clearInterval(retryTimer);
        retryTimer = null;
      }
      openPending = false;
    }
  }, 200);
}
