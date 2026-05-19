import { useCallback } from "react";
import {
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { toast } from "sonner";
import { authMeQueryKey } from "@/features/auth/hooks/use-me-query";
import { creatorProfileMeQueryKey } from "../api/fetch-creator-profile-me";
import {
  createCreatorProfile,
  type CreateCreatorProfilePayload,
} from "../api/create-creator-profile";
import {
  updateCreatorProfile,
  type UpdateCreatorProfilePayload,
} from "../api/update-creator-profile";
import {
  presignCreatorProfileIntroVideoUpload,
  putIntroVideoToPresignedUrl,
  type PresignProfileIntroVideoUploadResponse,
} from "../api/presign-creator-profile-intro-video";

type CreatorProfileMode = "create" | "update";

type SubmitCreatorProfileVariables = {
  payload: CreateCreatorProfilePayload | UpdateCreatorProfilePayload;
};

type SubmitCreatorProfileResult =
  | { status: "skipped" }
  | { status: "created" }
  | { status: "updated" }
  | { status: "already-exists" };

export function useUploadCreatorIntroVideoMutation(mode: CreatorProfileMode) {
  return useMutation({
    mutationKey: ["creators", "profile", "intro-video-upload", mode],
    mutationFn: async (
      {
        file,
        contentType,
      }: {
        file: File;
        contentType: string;
      },
    ): Promise<PresignProfileIntroVideoUploadResponse | null> => {
      const presign = await presignCreatorProfileIntroVideoUpload({
        contentType,
        contentLength: file.size,
      });
      await putIntroVideoToPresignedUrl(file, presign);
      return presign;
    },
    onSuccess: (result) => {
      if (!result) {
        return;
      }

      toast.success(
        mode === "update"
          ? "Intro video uploaded — save your profile to apply."
          : "Intro video uploaded — create your profile to apply.",
      );
    },
    onError: (error) => {
      if (isAxiosError(error) && error.response?.status === 403) {
        toast.error("You do not have access to upload an intro video.");
        return;
      }

      toast.error("Could not upload intro video. Try again.");
    },
  });
}

export function useSubmitCreatorProfileMutation({
  mode,
  profileId,
  onSuccess,
}: {
  mode: CreatorProfileMode;
  profileId?: string;
  onSuccess?: () => void | Promise<void>;
}) {
  const queryClient = useQueryClient();

  const invalidateCreatorQueries = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: authMeQueryKey });
    await queryClient.invalidateQueries({ queryKey: creatorProfileMeQueryKey });
  }, [queryClient]);

  return useMutation({
    mutationKey: ["creators", "profile", "submit", mode, profileId ?? "new"],
    mutationFn: async ({
      payload,
    }: SubmitCreatorProfileVariables): Promise<SubmitCreatorProfileResult> => {
      if (mode === "update") {
        if (!profileId) {
          throw new Error("Missing profile id");
        }

        await updateCreatorProfile(profileId, payload as UpdateCreatorProfilePayload);
        return { status: "updated" };
      }

      try {
        await createCreatorProfile(payload as CreateCreatorProfilePayload);
        return { status: "created" };
      } catch (error) {
        if (isAxiosError(error) && error.response?.status === 409) {
          return { status: "already-exists" };
        }

        throw error;
      }
    },
    onSuccess: async (result) => {
      if (result.status === "skipped") {
        return;
      }

      await invalidateCreatorQueries();

      if (result.status === "updated") {
        toast.success("Profile updated");
        await onSuccess?.();
        return;
      }

      if (result.status === "already-exists") {
        toast.message("Profile already exists", {
          description: "Continuing to your workspace.",
        });
      } else {
        toast.success("Creator profile created");
      }

      await onSuccess?.();
    },
    onError: () => {
      toast.error(
        mode === "update"
          ? "Could not update profile"
          : "Could not create profile",
        {
          description: "Check your connection and try again.",
        },
      );
    },
  });
}
