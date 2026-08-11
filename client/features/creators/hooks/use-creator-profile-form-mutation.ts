import { useCallback } from "react";
import {
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { toast } from "sonner";
import { authMeQueryKey } from "@/features/auth/hooks/use-me-query";
import { isProfileFirstOnboardingMode } from "@/features/auth/lib/creator-onboarding-mode";
import { creatorProfileMeQueryKey } from "../api/fetch-creator-profile-me";

import {
  updateCreatorProfile,
  type UpdateCreatorProfilePayload,
} from "../api/update-creator-profile";
import { updateCreatorProfileAdmin } from "@/features/admin/api/update-creator";
import {
  presignCreatorProfileIntroVideoUpload,
  putIntroVideoToPresignedUrl,
  type PresignProfileIntroVideoUploadResponse,
} from "../api/presign-creator-profile-intro-video";
import {
  presignCreatorProfileImageUpload,
  putProfileImageToPresignedUrl,
  type PresignProfileImageUploadResponse,
} from "../api/presign-creator-profile-image";

/**
 * Pull the human-readable reason out of an API error so the toast can show
 * *why* the save failed (e.g. "bio must be shorter than or equal to 500
 * characters") instead of a generic connection message. Returns null when the
 * error carries no server message (network/timeout) so callers can fall back.
 */
function extractProfileErrorMessage(error: unknown): string | null {
  if (!isAxiosError(error)) return null;
  const message = error.response?.data?.message;
  if (Array.isArray(message) && message.length > 0) {
    return message.join(", ");
  }
  if (typeof message === "string" && message.trim()) {
    return message;
  }
  return null;
}

type CreatorProfileMode = "create" | "update";

type SubmitCreatorProfileVariables = {
  payload: UpdateCreatorProfilePayload;
};

type SubmitCreatorProfileResult =
  | { status: "skipped" }
  | { status: "updated"; goLive: boolean };

export function useUploadCreatorIntroVideoMutation(options: {
  mode: CreatorProfileMode;
  creatorProfileId?: string;
}) {
  const { mode, creatorProfileId } = options;
  return useMutation({
    mutationKey: [
      "creators",
      "profile",
      "intro-video-upload",
      mode,
      creatorProfileId ?? "self",
    ],
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
        ...(creatorProfileId ? { creatorProfileId } : {}),
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

export function useUploadCreatorProfileImageMutation(options: {
  mode: CreatorProfileMode;
  creatorProfileId?: string;
}) {
  const { mode, creatorProfileId } = options;
  return useMutation({
    mutationKey: [
      "creators",
      "profile",
      "profile-image-upload",
      mode,
      creatorProfileId ?? "self",
    ],
    mutationFn: async (
      {
        file,
        contentType,
      }: {
        file: File;
        contentType: string;
      },
    ): Promise<PresignProfileImageUploadResponse | null> => {
      const presign = await presignCreatorProfileImageUpload({
        contentType,
        contentLength: file.size,
        ...(creatorProfileId ? { creatorProfileId } : {}),
      });
      await putProfileImageToPresignedUrl(file, presign);
      return presign;
    },
    onSuccess: (result) => {
      if (!result) {
        return;
      }

      toast.success(
        mode === "update"
          ? "Profile image uploaded — save your profile to apply."
          : "Profile image uploaded — create your profile to apply.",
      );
    },
    onError: (error) => {
      if (isAxiosError(error) && error.response?.status === 403) {
        toast.error("You do not have access to upload a profile image.");
        return;
      }

      toast.error("Could not upload profile image. Try again.");
    },
  });
}

export function useSubmitCreatorProfileMutation({
  mode,
  profileId,
  adminMode,
  onSuccess,
}: {
  mode: CreatorProfileMode;
  profileId?: string;
  adminMode?: boolean;
  onSuccess?: (result: SubmitCreatorProfileResult) => void | Promise<void>;
}) {
  const queryClient = useQueryClient();

  const invalidateCreatorQueries = useCallback(async () => {
    if (adminMode) {
      await queryClient.invalidateQueries({ queryKey: ["creators", "list"] });
      if (profileId) {
        await queryClient.invalidateQueries({ queryKey: ["creators", "profile", profileId] });
      }
    } else {
      await queryClient.invalidateQueries({ queryKey: authMeQueryKey });
      await queryClient.invalidateQueries({ queryKey: creatorProfileMeQueryKey });
    }
  }, [queryClient, adminMode, profileId]);

  return useMutation({
    mutationKey: ["creators", "profile", "submit", mode, profileId ?? "new"],
    mutationFn: async ({
      payload,
    }: SubmitCreatorProfileVariables): Promise<SubmitCreatorProfileResult> => {
      if (mode === "update") {
        if (!profileId) {
          throw new Error("Missing profile id");
        }

        if (adminMode) {
          await updateCreatorProfileAdmin(profileId, payload as UpdateCreatorProfilePayload);
        } else {
          await updateCreatorProfile(profileId, payload as UpdateCreatorProfilePayload);
        }
        return { status: "updated", goLive: payload.goLive === true };
      }
      
      throw new Error("Create mode is no longer supported.");
    },
    onSuccess: async (result) => {
      if (result.status === "skipped") {
        return;
      }

      await invalidateCreatorQueries();

      if (result.status === "updated") {
        if (result.goLive) {
          toast.success(
            isProfileFirstOnboardingMode()
              ? "Profile submitted for review"
              : "You're live on the marketplace",
          );
        } else {
          toast.success("Profile updated");
        }
        await onSuccess?.(result);
        return;
      }

      await onSuccess?.(result);
    },
    onError: (error) => {
      toast.error(
        "Could not update profile",
        {
          description:
            extractProfileErrorMessage(error) ??
            "Check your connection and try again.",
        },
      );
    },
  });
}
