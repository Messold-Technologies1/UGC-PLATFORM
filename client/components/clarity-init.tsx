"use client";

import { useEffect } from "react";
import { initClarity } from "@/lib/clarity";

/**
 * Initializes Microsoft Clarity once on the client. Mounted at the root so it
 * runs on every page (public and authenticated). No-op when
 * NEXT_PUBLIC_CLARITY_PROJECT_ID is unset. Renders nothing.
 */
export function ClarityInit() {
  useEffect(() => {
    initClarity();
  }, []);
  return null;
}
