"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { portfolioMyVideosQueryKey } from "../api/list-my-portfolio-videos";
import { portfolioAdminVideosQueryKey } from "../api/list-admin-portfolio-videos";
import { publicPortfolioVideosByCreatorQueryKey } from "../api/list-public-portfolio-videos";
import { updatePortfolioVideo } from "../api/update-portfolio-video";
import {
  presignPortfolioUpload,
  putPortfolioFileToPresignedUrl,
} from "../api/presign-portfolio-upload";
import {
  PORTFOLIO_VIDEO_MAX_BYTES,
  formatBytes,
  uploadPortfolioVideo,
} from "../lib/upload-portfolio-video";
import { convertHeicIfNeeded } from "@/lib/heic-to-web-image";

export type ReplacePortfolioVideoFlowVariables = {
  videoId: string;
  videoFile: File;
  thumbnailFile?: File | null;
  adminCreatorId?: string;
  onProgress?: (fraction: number) => void;
};

function resolveVideoContentType(file: File): string {
  if (file.type) return file.type;
  const name = file.name.toLowerCase();
  if (name.endsWith(".mov")) return "video/quicktime";
  if (name.endsWith(".webm")) return "video/webm";
  return "video/mp4";
}

/**
 * Swap the file on an existing portfolio entry: upload the replacement, then
 * PATCH the row with its key. Used by the Replace action, which is the only way
 * to change a video once the portfolio is at the minimum-videos floor.
 *
 * The old S3 objects are removed server-side after the row is updated, so
 * nothing here has to clean up.
 */
export function useReplacePortfolioVideoFlowMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      videoId,
      videoFile,
      thumbnailFile,
      adminCreatorId,
      onProgress,
    }: ReplacePortfolioVideoFlowVariables) => {
      if (videoFile.size > PORTFOLIO_VIDEO_MAX_BYTES) {
        throw new Error(
          `Video is too large (max ${formatBytes(PORTFOLIO_VIDEO_MAX_BYTES)}).`,
        );
      }
      const requestOptions = adminCreatorId ? { adminCreatorId } : undefined;

      const video = await uploadPortfolioVideo(
        videoFile,
        resolveVideoContentType(videoFile),
        requestOptions,
        onProgress,
      );

      let thumbnailKey: string | undefined;
      if (thumbnailFile) {
        const converted = await convertHeicIfNeeded(thumbnailFile);
        const presign = await presignPortfolioUpload(
          {
            kind: "thumbnail",
            contentType: converted.type || "image/jpeg",
            contentLength: converted.size,
          },
          requestOptions,
        );
        await putPortfolioFileToPresignedUrl(converted, presign);
        thumbnailKey = presign.key;
      }

      // Sending no thumbnailKey clears the old one server-side — correct here,
      // since it was cut from the clip being replaced. contentHash goes along
      // for the same reason: the row must stop being checked against the file
      // it no longer holds. `video.contentHash` is undefined when the file
      // was too large to hash client-side, and the server clears the column
      // in that case rather than leave the outgoing file's hash in place.
      return updatePortfolioVideo(
        videoId,
        { videoKey: video.key, thumbnailKey, contentHash: video.contentHash },
        requestOptions,
      );
    },
    onSuccess: async (_updated, variables) => {
      toast.success("Portfolio video replaced");
      if (variables.adminCreatorId) {
        await Promise.all([
          queryClient.invalidateQueries({
            queryKey: publicPortfolioVideosByCreatorQueryKey(
              variables.adminCreatorId,
            ),
          }),
          queryClient.invalidateQueries({
            queryKey: portfolioAdminVideosQueryKey(variables.adminCreatorId),
          }),
        ]);
        return;
      }
      await queryClient.invalidateQueries({
        queryKey: portfolioMyVideosQueryKey,
      });
    },
    onError: (error: unknown) => {
      toast.error(
        error instanceof Error ? error.message : "Could not replace the video",
      );
    },
  });
}
