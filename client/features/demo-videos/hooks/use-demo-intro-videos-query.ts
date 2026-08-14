import { useQuery } from "@tanstack/react-query";
import { fetchDemoIntroVideos } from "../api/fetch-demo-intro-videos";

export const demoIntroVideosQueryKey = ["demo-intro-videos"] as const;

/** Active example clips for the Intro Video wizard step's gallery. */
export function useDemoIntroVideosQuery() {
  return useQuery({
    queryKey: demoIntroVideosQueryKey,
    queryFn: fetchDemoIntroVideos,
    staleTime: 5 * 60_000,
  });
}
