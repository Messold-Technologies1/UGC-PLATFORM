"use client";

import { useEffect } from "react";

export function GlobalVideoManager() {
  useEffect(() => {
    const handlePlay = (e: Event) => {
      const target = e.target as HTMLMediaElement;

      if (target && target.tagName === "VIDEO") {
        const videos = document.querySelectorAll("video");

        videos.forEach((video) => {
          if (video !== target && !video.paused) {
            video.pause();
          }
        });
      }
    };

    document.addEventListener("play", handlePlay, true);

    return () => {
      document.removeEventListener("play", handlePlay, true);
    };
  }, []);

  return null;
}
