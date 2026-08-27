import { isAxiosError } from "axios";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { retryPortfolioMirror } from "../api/retry-portfolio-mirror";
import { portfolioMyVideosQueryKey } from "../api/list-my-portfolio-videos";
import { portfolioAdminVideosQueryKey } from "../api/list-admin-portfolio-videos";

function retryErrorMessage(error: unknown): string {
  if (isAxiosError(error)) {
    const message = error.response?.data?.message;
    if (typeof message === "string" && message.trim()) return message;
    if (Array.isArray(message) && message.length > 0) return message.join(", ");
  }
  if (error instanceof Error && error.message.trim()) return error.message;
  return "Something went wrong";
}

/**
 * Retry the Instagram copy for videos parked in FAILED.
 *
 * Takes a list because the banner retries everything that failed at once, which
 * is what a creator means by "try again" — chasing one tile at a time is busywork
 * when the usual cause (an expired CDN URL, a blip) affected all of them.
 */
export function useRetryPortfolioMirrorMutation(options?: {
  adminCreatorId?: string;
}) {
  const queryClient = useQueryClient();
  const queryKey = options?.adminCreatorId
    ? portfolioAdminVideosQueryKey(options.adminCreatorId)
    : portfolioMyVideosQueryKey;

  return useMutation({
    mutationFn: async (videoIds: string[]) => {
      const results = await Promise.allSettled(
        videoIds.map((id) =>
          retryPortfolioMirror(id, {
            adminCreatorId: options?.adminCreatorId,
          }),
        ),
      );
      const failures = results.filter((r) => r.status === "rejected");
      // Report a partial failure rather than a blanket success: some of these
      // may have been retried and some refused.
      if (failures.length > 0 && failures.length === results.length) {
        throw (failures[0] as PromiseRejectedResult).reason;
      }
      return {
        queued: results.length - failures.length,
        failed: failures.length,
      };
    },
    onSuccess: ({ queued, failed }) => {
      if (queued > 0) {
        toast.success(
          queued === 1
            ? "Retrying — the video will appear once it copies over"
            : `Retrying ${queued} videos — they will appear once they copy over`,
        );
      }
      if (failed > 0) {
        toast.error(
          failed === 1
            ? "1 video could not be retried"
            : `${failed} videos could not be retried`,
        );
      }
      void queryClient.invalidateQueries({ queryKey });
    },
    onError: (error: unknown) => {
      toast.error("Could not retry", { description: retryErrorMessage(error) });
    },
  });
}
