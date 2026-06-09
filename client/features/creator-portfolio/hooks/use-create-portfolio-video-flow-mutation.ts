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

type CreatePortfolioVideoFlowVariables = {
  videoFile: File;
  thumbnailFile: File | null;
  visibility: "public" | "private";
  metadataPatch: UpdatePortfolioVideoPayload | null;
  adminCreatorId?: string;
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

export function useCreatePortfolioVideoFlowMutation() {
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
    }: CreatePortfolioVideoFlowVariables) => {
      const requestOptions = adminCreatorId ? { adminCreatorId } : undefined;
      const videoPresign = await presignPortfolioUpload(
        {
          kind: "video",
          contentType: resolveVideoContentType(videoFile),
          contentLength: videoFile.size,
        },
        requestOptions,
      );
      await putPortfolioFileToPresignedUrl(videoFile, videoPresign);

      let thumbnailKey: string | undefined;
      if (thumbnailFile) {
        const thumbnailPresign = await presignPortfolioUpload(
          {
            kind: "thumbnail",
            contentType: resolveImageContentType(thumbnailFile),
            contentLength: thumbnailFile.size,
          },
          requestOptions,
        );
        await putPortfolioFileToPresignedUrl(thumbnailFile, thumbnailPresign);
        thumbnailKey = thumbnailPresign.key;
      }

      const created = await createPortfolioVideo(
        {
          videoKey: videoPresign.key,
          thumbnailKey,
          visibilityStatus: visibility,
        },
        requestOptions,
      );

      if (metadataPatch) {
        await updatePortfolioVideo(created.id, metadataPatch, requestOptions);
      }

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
      router.push("/creator/portfolio");
    },
    onError: (error) => {
      toast.error("Upload failed", {
        description: getUploadErrorMessage(error),
      });
    },
  });
}
