import { isAxiosError } from "axios";
import {
  useMutation,
  useQueryClient,
  type UseMutationOptions,
} from "@tanstack/react-query";
import { toast } from "sonner";
import type { PortfolioVideoApi } from "../api/types";
import { updatePortfolioVideo, type UpdatePortfolioVideoPayload } from "../api/update-portfolio-video";
import { portfolioMyVideosQueryKey } from "../api/list-my-portfolio-videos";
import { portfolioAdminVideosQueryKey } from "../api/list-admin-portfolio-videos";

type UpdatePortfolioVideoVariables = {
  videoId: string;
  payload: UpdatePortfolioVideoPayload;
  adminCreatorId?: string;
};

type UpdatePortfolioVideoContext = {
  previousVideos?: PortfolioVideoApi[];
};

type UpdatePortfolioVideoMutationOptions = UseMutationOptions<
  PortfolioVideoApi,
  Error,
  UpdatePortfolioVideoVariables,
  UpdatePortfolioVideoContext
>;

function getUpdatePortfolioVideoErrorMessage(error: unknown): string {
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

export function useUpdatePortfolioVideoMutation(
  options?: UpdatePortfolioVideoMutationOptions,
) {
  const queryClient = useQueryClient();

  return useMutation({
    ...options,
    mutationKey: ["creator-portfolio", "update-video"],
    mutationFn: ({ videoId, payload, adminCreatorId }: UpdatePortfolioVideoVariables) =>
      updatePortfolioVideo(videoId, payload, adminCreatorId ? { adminCreatorId } : undefined),
    onMutate: async (variables, context) => {
      await queryClient.cancelQueries({ queryKey: portfolioMyVideosQueryKey });

      const previousVideos = queryClient.getQueryData<PortfolioVideoApi[]>(
        portfolioMyVideosQueryKey,
      );

      queryClient.setQueryData<PortfolioVideoApi[]>(
        portfolioMyVideosQueryKey,
        (current) =>
          (current ?? []).map((video) =>
            video.id === variables.videoId
              ? { ...video, ...variables.payload }
              : video,
          ),
      );

      const onMutateResult = await options?.onMutate?.(variables, context);

      return {
        previousVideos,
        ...(onMutateResult ?? {}),
      };
    },
    onSuccess: (data, variables, onMutateResult, context) => {
      toast.success("Portfolio video updated");
      options?.onSuccess?.(data, variables, onMutateResult, context);
    },
    onError: (error, variables, onMutateResult, context) => {
      if (onMutateResult?.previousVideos) {
        const queryKey = variables.adminCreatorId
          ? portfolioAdminVideosQueryKey(variables.adminCreatorId)
          : portfolioMyVideosQueryKey;

        queryClient.setQueryData(queryKey, onMutateResult.previousVideos);
      }

      toast.error("Could not update video", {
        description: getUpdatePortfolioVideoErrorMessage(error),
      });

      options?.onError?.(error, variables, onMutateResult, context);
    },
    onSettled: (data, error, variables, onMutateResult, context) => {
      if (variables.adminCreatorId) {
        void queryClient.invalidateQueries({
          queryKey: portfolioAdminVideosQueryKey(variables.adminCreatorId),
        });
      } else {
        void queryClient.invalidateQueries({
          queryKey: portfolioMyVideosQueryKey,
        });
      }
      options?.onSettled?.(data, error, variables, onMutateResult, context);
    },
  });
}
