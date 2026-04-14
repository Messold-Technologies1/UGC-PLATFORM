import { useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { toast } from "sonner";
import { authMeQueryKey } from "@/features/auth/hooks/use-me-query";
import { ensureWorkspaceSelection } from "@/features/auth/lib/ensure-workspace-selection";
import { useAuth } from "@/providers/auth-provider";
import {
  brandProfileMeQueryKey,
  fetchBrandProfileMe,
} from "../api/fetch-brand-profile-me";
import { brandProfileStateQueryKey } from "../api/fetch-brand-profile-state";
import {
  createBrandProfile,
  type CreateBrandProfilePayload,
} from "../api/create-brand-profile";
import {
  updateBrandProfile,
  type UpdateBrandProfilePayload,
} from "../api/update-brand-profile";
import {
  presignBrandLogoUpload,
  putFileToPresignedUrl,
  type PresignBrandLogoUploadResponse,
} from "../api/presign-brand-logo-upload";

type BrandProfileMode = "create" | "update";

type SubmitBrandProfileVariables = {
  payload: CreateBrandProfilePayload | UpdateBrandProfilePayload;
};

type SubmitBrandProfileResult =
  | { status: "skipped" }
  | { status: "created" }
  | { status: "updated" }
  | { status: "already-exists" };

function useEnsureBrandWorkspace() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useCallback(async () => {
    if (user?.brandAccessRevoked) {
      toast.error("Your brand access has been removed by admin.");
      return false;
    }

    return ensureWorkspaceSelection(queryClient, user, "BRAND");
  }, [queryClient, user]);
}

export function useUploadBrandLogoMutation(mode: BrandProfileMode) {
  const ensureBrandWorkspace = useEnsureBrandWorkspace();

  return useMutation({
    mutationKey: ["brands", "profile", "logo-upload", mode],
    mutationFn: async (
      file: File,
    ): Promise<PresignBrandLogoUploadResponse | null> => {
      const ok = await ensureBrandWorkspace();
      if (!ok) {
        return null;
      }

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
  onSuccess?: () => void;
}) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const ensureBrandWorkspace = useEnsureBrandWorkspace();

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
      const ok = await ensureBrandWorkspace();
      if (!ok) {
        return { status: "skipped" };
      }

      if (mode === "update") {
        await updateBrandProfile(payload as UpdateBrandProfilePayload);
        return { status: "updated" };
      }

      try {
        await createBrandProfile(payload as CreateBrandProfilePayload);
        return { status: "created" };
      } catch (error) {
        if (isAxiosError(error) && error.response?.status === 409) {
          const workspaceOk = await ensureBrandWorkspace();
          if (!workspaceOk) {
            return { status: "skipped" };
          }

          return { status: "already-exists" };
        }

        if (
          isAxiosError(error) &&
          (error.response?.status ?? 0) >= 500
        ) {
          await invalidateBrandProfileQueries();

          try {
            await queryClient.fetchQuery({
              queryKey: brandProfileMeQueryKey,
              queryFn: fetchBrandProfileMe,
            });
            return { status: "created" };
          } catch {}
        }

        throw error;
      }
    },
    onSuccess: async (result) => {
      if (result.status === "skipped") {
        return;
      }

      await invalidateBrandProfileQueries();

      if (result.status === "updated") {
        toast.success("Brand profile updated");
      } else if (result.status === "already-exists") {
        toast.message("Profile already exists", {
          description: "Continuing to your dashboard.",
        });
      } else {
        toast.success("Brand profile created");
      }

      onSuccess?.();

      if (mode === "create") {
        router.replace("/brand/account");
      }
    },
    onError: (error) => {
      if (isAxiosError(error) && error.response?.status === 403) {
        toast.error("Your brand access has been removed by admin.");
        return;
      }

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
