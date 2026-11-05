"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { toast } from "sonner";
import { creatorProfileMeQueryKey } from "../api/fetch-creator-profile-me";
import { updateCreatorProfile } from "../api/update-creator-profile";
import type { CreatorProfileItemApi } from "../api/types";

type UsePublicPageTemplateMutationArgs = {
  creatorProfileId: string | undefined;
};

/**
 * Saves the creator's public-page template choice.
 *
 * Deliberately separate from the big profile form mutation: this is a
 * one-field change made from a different screen, and routing it through the
 * form mutation would drag in its upload/facet-resolution machinery.
 *
 * Applies optimistically so the picker's selected state flips immediately, and
 * rolls back if the request fails.
 */
export function usePublicPageTemplateMutation({
  creatorProfileId,
}: UsePublicPageTemplateMutationArgs) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (templateId: string) => {
      if (!creatorProfileId) {
        throw new Error("Creator profile is not loaded yet");
      }
      return updateCreatorProfile(creatorProfileId, {
        publicPageTemplate: templateId,
      });
    },
    onMutate: async (templateId) => {
      await queryClient.cancelQueries({ queryKey: creatorProfileMeQueryKey });
      const previous = queryClient.getQueryData<CreatorProfileItemApi>(
        creatorProfileMeQueryKey,
      );
      if (previous) {
        queryClient.setQueryData<CreatorProfileItemApi>(
          creatorProfileMeQueryKey,
          { ...previous, publicPageTemplate: templateId },
        );
      }
      return { previous };
    },
    onError: (error, _templateId, context) => {
      if (context?.previous) {
        queryClient.setQueryData(creatorProfileMeQueryKey, context.previous);
      }
      const message =
        (isAxiosError(error) &&
          (Array.isArray(error.response?.data?.message)
            ? error.response?.data?.message.join(", ")
            : error.response?.data?.message)) ||
        "Could not save your design. Please try again.";
      toast.error(String(message));
    },
    onSuccess: () => {
      toast.success("Your public page design has been updated.");
    },
    onSettled: () => {
      void queryClient.invalidateQueries({
        queryKey: creatorProfileMeQueryKey,
      });
    },
  });
}
