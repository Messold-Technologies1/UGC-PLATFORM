import { isAxiosError } from "axios";
import {
  useMutation,
  useQueryClient,
  type UseMutationOptions,
} from "@tanstack/react-query";
import { toast } from "sonner";
import type { PortfolioVideoApi } from "../api/types";
import { deletePortfolioVideo } from "../api/delete-portfolio-video";
import { portfolioMyVideosQueryKey } from "../api/list-my-portfolio-videos";
import { portfolioAdminVideosQueryKey } from "../api/list-admin-portfolio-videos";

type DeletePortfolioVideoVariables = {
  videoId: string;
  adminCreatorId?: string;
};

type DeletePortfolioVideoContext = {
  previousVideos?: PortfolioVideoApi[];
};

type DeletePortfolioVideoMutationOptions = UseMutationOptions<
  void,
  Error,
  DeletePortfolioVideoVariables,
  DeletePortfolioVideoContext
>;

function getDeletePortfolioVideoErrorMessage(error: unknown): string {
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

export function useDeletePortfolioVideoMutation(
  options?: DeletePortfolioVideoMutationOptions,
) {
  const queryClient = useQueryClient();

  return useMutation({
    ...options,
    mutationKey: ["creator-portfolio", "delete-video"],
    mutationFn: ({ videoId, adminCreatorId }: DeletePortfolioVideoVariables) =>
      deletePortfolioVideo(videoId, { adminCreatorId }),
    onMutate: async (variables, context) => {
      const queryKey = variables.adminCreatorId
        ? portfolioAdminVideosQueryKey(variables.adminCreatorId)
        : portfolioMyVideosQueryKey;

      await queryClient.cancelQueries({ queryKey });

      const previousVideos = queryClient.getQueryData<PortfolioVideoApi[]>(queryKey);

      queryClient.setQueryData<PortfolioVideoApi[]>(
        queryKey,
        (current) => (current ?? []).filter((video) => video.id !== variables.videoId),
      );

      const onMutateResult = await options?.onMutate?.(variables, context);

      return {
        previousVideos,
        ...(onMutateResult ?? {}),
      };
    },
    onSuccess: (data, variables, onMutateResult, context) => {
      toast.success("Video removed from portfolio");
      options?.onSuccess?.(data, variables, onMutateResult, context);
    },
    onError: (error, variables, onMutateResult, context) => {
      if (onMutateResult?.previousVideos) {
        const queryKey = variables.adminCreatorId
          ? portfolioAdminVideosQueryKey(variables.adminCreatorId)
          : portfolioMyVideosQueryKey;

        queryClient.setQueryData(
          queryKey,
          onMutateResult.previousVideos,
        );
      }

      toast.error("Could not delete video", {
        description: getDeletePortfolioVideoErrorMessage(error),
      });

      options?.onError?.(error, variables, onMutateResult, context);
    },
    onSettled: (data, error, variables, onMutateResult, context) => {
      const queryKey = variables.adminCreatorId
        ? portfolioAdminVideosQueryKey(variables.adminCreatorId)
        : portfolioMyVideosQueryKey;
        
      void queryClient.invalidateQueries({ queryKey });
      options?.onSettled?.(data, error, variables, onMutateResult, context);
    },
  });
}
