import { useCallback } from "react";
import { useRouter } from "next/navigation";
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
  presignCreatorProfileImageUpload,
  putFileToPresignedUrl,
  type PresignProfileImageUploadResponse,
} from "../api/presign-creator-profile-image";

type CreatorProfileMode = "create" | "update";

type SubmitCreatorProfileVariables = {
  payload: CreateCreatorProfilePayload | UpdateCreatorProfilePayload;
};

type SubmitCreatorProfileResult =
  | { status: "skipped" }
  | { status: "created" }
  | { status: "updated" }
  | { status: "already-exists" };

export function useUploadCreatorProfileImageMutation() {
  return useMutation({
    mutationKey: ["creators", "profile", "image-upload"],
    mutationFn: async (
      file: File,
    ): Promise<PresignProfileImageUploadResponse | null> => {
      const presign = await presignCreatorProfileImageUpload({
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

      toast.success("Photo uploaded — save your profile to apply.");
    },
    onError: () => {
      toast.error("Could not upload image. Try again.");
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
  onSuccess?: () => void;
}) {
  const queryClient = useQueryClient();
  const router = useRouter();

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
        onSuccess?.();
        return;
      }

      if (result.status === "already-exists") {
        toast.message("Profile already exists", {
          description: "Continuing to your dashboard.",
        });
      } else {
        toast.success("Creator profile created");
      }

      onSuccess?.();
      router.replace("/creator/account");
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
