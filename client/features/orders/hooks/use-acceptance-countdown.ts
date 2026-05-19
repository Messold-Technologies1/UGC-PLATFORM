import { useState, useEffect } from "react";

export function useAcceptanceCountdown(
  briefSubmittedAt: string | null | undefined,
  status: string
) {
  const [now, setNow] = useState(() => new Date());
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setIsMounted(true);
    }, 0);
    return () => clearTimeout(timeout);
  }, []);

  useEffect(() => {
    if (!isMounted || status === "BRIEF_SUBMISSION_PENDING" || !briefSubmittedAt) {
      return;
    }

    const submittedDate = new Date(briefSubmittedAt);
    const deadline = new Date(submittedDate.getTime() + 48 * 60 * 60 * 1000);

    const interval = setInterval(() => {
      const currentTime = new Date();
      setNow(currentTime);
      
      if (currentTime.getTime() >= deadline.getTime()) {
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isMounted, briefSubmittedAt, status]);

  // Handle server-side rendering or missing dates gracefully
  if (!isMounted || status === "BRIEF_SUBMISSION_PENDING" || !briefSubmittedAt) {
    return { hours: "00", minutes: "00", seconds: "00", isExpired: true, percentage: 0 };
  }

  const TOTAL_BUDGET_MS = 48 * 60 * 60 * 1000;
  const submittedDate = new Date(briefSubmittedAt);
  const deadline = new Date(submittedDate.getTime() + TOTAL_BUDGET_MS);
  const diff = deadline.getTime() - now.getTime();

  if (diff <= 0) {
    return { hours: "00", minutes: "00", seconds: "00", isExpired: true, percentage: 0 };
  }

  const h = Math.floor(diff / (1000 * 60 * 60));
  const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const s = Math.floor((diff % (1000 * 60)) / 1000);
  const percentage = Math.max(0, Math.min(100, (diff / TOTAL_BUDGET_MS) * 100));

  return {
    hours: h.toString().padStart(2, "0"),
    minutes: m.toString().padStart(2, "0"),
    seconds: s.toString().padStart(2, "0"),
    isExpired: false,
    percentage,
  };
}
