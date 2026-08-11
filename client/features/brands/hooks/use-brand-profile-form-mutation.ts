import { useCallback } from "react";
import {
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { toast } from "sonner";
import { authMeQueryKey } from "@/features/auth/hooks/use-me-query";
import {
  brandProfileMeQueryKey,
} from "../api/fetch-brand-profile-me";
import { brandProfileStateQueryKey } from "../api/fetch-brand-profile-state";
import {
  updateBrandProfile,
  type UpdateBrandProfilePayload,
} from "../api/update-brand-profile";
import {
  presignBrandLogoUpload,
  putFileToPresignedUrl,
  type PresignBrandLogoUploadResponse,
} from "../api/presign-brand-logo-upload";
import {
  presignBrandPronunciationUpload,
  putBlobToPresignedUrl,
  type PresignBrandPronunciationUploadResponse,
} from "../api/presign-brand-pronunciation-upload";

type BrandProfileMode = "create" | "update";

type SubmitBrandProfileVariables = {
  payload: UpdateBrandProfilePayload;
};

type SubmitBrandProfileResult =
  | { status: "skipped" }
  | { status: "updated" };

export function useUploadBrandPronunciationMutation(mode: BrandProfileMode) {
  return useMutation({
    mutationKey: ["brands", "profile", "pronunciation-upload", mode],
    mutationFn: async (
      blob: Blob,
    ): Promise<PresignBrandPronunciationUploadResponse | null> => {
      const presign = await presignBrandPronunciationUpload({
        contentType: blob.type || "audio/webm",
        contentLength: blob.size,
      });
      await putBlobToPresignedUrl(blob, presign);
      return presign;
    },
    onSuccess: (result) => {
      if (!result) return;
      toast.success(
        mode === "update"
          ? "Pronunciation uploaded — save your profile to apply."
          : "Pronunciation uploaded — create your profile to apply.",
      );
    },
    onError: (error) => {
      if (isAxiosError(error) && error.response?.status === 403) {
        toast.error("Your brand access has been removed by admin.");
        return;
      }
      toast.error("Could not upload pronunciation audio. Try again.");
    },
  });
}

export function useUploadBrandLogoMutation(mode: BrandProfileMode) {
  return useMutation({
    mutationKey: ["brands", "profile", "logo-upload", mode],
    mutationFn: async (
      file: File,
    ): Promise<PresignBrandLogoUploadResponse | null> => {
      const presign = await presignBrandLogoUpload({
        contentType: file.type,
        contentLength: file.size,
      });
      await putFileToPresignedUrl(file, presign);
      return presign;
    },
    onSuccess: (result) => {
      if (!result) {
        return;
      }

      toast.success(
        mode === "update"
          ? "Logo uploaded — update your profile to apply."
          : "Logo uploaded — create your profile to apply.",
      );
    },
    onError: (error) => {
      if (isAxiosError(error) && error.response?.status === 403) {
        toast.error("Your brand access has been removed by admin.");
        return;
      }

      toast.error("Could not upload logo. Try again.");
    },
  });
}

export function useSubmitBrandProfileMutation({
  mode,
  onSuccess,
}: {
  mode: BrandProfileMode;
  onSuccess?: () => void | Promise<void>;
}) {
  const queryClient = useQueryClient();

  const invalidateBrandProfileQueries = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: authMeQueryKey });
    await queryClient.invalidateQueries({ queryKey: brandProfileMeQueryKey });
    await queryClient.invalidateQueries({ queryKey: brandProfileStateQueryKey });
  }, [queryClient]);

  return useMutation({
    mutationKey: ["brands", "profile", "submit", mode],
    mutationFn: async ({
      payload,
    }: SubmitBrandProfileVariables): Promise<SubmitBrandProfileResult> => {
      if (mode === "update") {
        await updateBrandProfile(payload as UpdateBrandProfilePayload);
        return { status: "updated" };
      }

      throw new Error("Create mode is no longer supported.");
    },
    onSuccess: async (result) => {
      if (result.status === "skipped") {
        return;
      }

      await invalidateBrandProfileQueries();

      if (result.status === "updated") {
        toast.success("Brand profile updated");
      }

      await onSuccess?.();
    },
    onError: (error) => {
      if (isAxiosError(error) && error.response?.status === 403) {
        toast.error("Your brand access has been removed by admin.");
        return;
      }

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

/**
 * Surface the server's reason for a failed save (e.g. a validation message)
 * instead of a generic connection error. Returns null for network/timeout
 * errors that carry no server message so callers can fall back.
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
