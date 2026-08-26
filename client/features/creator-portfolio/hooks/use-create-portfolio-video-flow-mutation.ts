import { useRouter } from "next/navigation";
import {
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { toast } from "sonner";
import { portfolioMyVideosQueryKey } from "../api/list-my-portfolio-videos";
import { portfolioAdminVideosQueryKey } from "../api/list-admin-portfolio-videos";
import { publicPortfolioVideosByCreatorQueryKey } from "../api/list-public-portfolio-videos";
import { createPortfolioVideo } from "../api/create-portfolio-video";
import {
  type UpdatePortfolioVideoPayload,
  updatePortfolioVideo,
} from "../api/update-portfolio-video";
import {
  presignPortfolioUpload,
  putPortfolioFileToPresignedUrl,
} from "../api/presign-portfolio-upload";
import {
  PORTFOLIO_VIDEO_MAX_BYTES,
  formatBytes,
  uploadPortfolioVideo,
} from "../lib/upload-portfolio-video";

type CreatePortfolioVideoFlowVariables = {
  videoFile: File;
  thumbnailFile: File | null;
  visibility: "public" | "private";
  metadataPatch: UpdatePortfolioVideoPayload | null;
  adminCreatorId?: string;
  /** Reports video upload progress as a 0..1 fraction. */
  onProgress?: (fraction: number) => void;
};

function resolveVideoContentType(file: File): string {
  const contentType = file.type?.trim();
  if (contentType) {
    return contentType;
  }

  const name = file.name.toLowerCase();
  if (name.endsWith(".mp4")) return "video/mp4";
  if (name.endsWith(".mov")) return "video/quicktime";
  if (name.endsWith(".webm")) return "video/webm";
  return "video/mp4";
}

function resolveImageContentType(file: File): string {
  const contentType = file.type?.trim();
  if (contentType) {
    return contentType;
  }

  const name = file.name.toLowerCase();
  if (name.endsWith(".png")) return "image/png";
  if (name.endsWith(".webp")) return "image/webp";
  return "image/jpeg";
}

function getUploadErrorMessage(error: unknown): string {
  if (isAxiosError(error)) {
    const message = error.response?.data?.message;

    if (typeof message === "string" && message.trim()) {
      return message;
    }

    if (Array.isArray(message) && message.length > 0) {
      return message.join(", ");
    }

    if (error.message.trim()) {
      return error.message;
    }
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return "Something went wrong";
}

export function useCreatePortfolioVideoFlowMutation(options?: { preventRedirect?: boolean }) {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationKey: ["creator-portfolio", "create-video-flow"],
    mutationFn: async ({
      videoFile,
      thumbnailFile,
      visibility,
      metadataPatch,
      adminCreatorId,
      onProgress,
    }: CreatePortfolioVideoFlowVariables) => {
      if (videoFile.size > PORTFOLIO_VIDEO_MAX_BYTES) {
        throw new Error(
          `Video is too large (max ${formatBytes(PORTFOLIO_VIDEO_MAX_BYTES)}).`,
        );
      }
      const requestOptions = adminCreatorId ? { adminCreatorId } : undefined;
      const uploadVideo = () =>
        uploadPortfolioVideo(
          videoFile,
          resolveVideoContentType(videoFile),
          requestOptions,
          onProgress,
        );

      const uploadThumbnail = async () => {
        if (!thumbnailFile) return undefined;
        const thumbnailPresign = await presignPortfolioUpload(
          {
            kind: "thumbnail",
            contentType: resolveImageContentType(thumbnailFile),
            contentLength: thumbnailFile.size,
          },
          requestOptions,
        );
        await putPortfolioFileToPresignedUrl(thumbnailFile, thumbnailPresign);
        return thumbnailPresign.key;
      };

      const [video, thumbnailKey] = await Promise.all([
        uploadVideo(),
        uploadThumbnail(),
      ]);

      const created = await createPortfolioVideo(
        {
          videoKey: video.key,
          thumbnailKey,
          // Recorded against the row so a later upload of the same file is
          // refused before it transfers. Undefined for files over the hashing
          // cap; the server treats that as "no duplicate check".
          contentHash: video.contentHash,
          visibilityStatus: visibility,
          ...metadataPatch,
        },
        requestOptions,
      );

      return created;
    },
    onSuccess: async (_created, variables) => {
      toast.success("Portfolio video added");
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
          queryClient.invalidateQueries({
            queryKey: ["creators", "profile", variables.adminCreatorId],
          }),
        ]);
        return;
      }

      await queryClient.invalidateQueries({
        queryKey: portfolioMyVideosQueryKey,
      });
      if (!options?.preventRedirect) {
        router.push("/creator/portfolio");
      }
    },
    onError: (error) => {
      toast.error("Upload failed", {
        description: getUploadErrorMessage(error),
      });
    },
  });
}
