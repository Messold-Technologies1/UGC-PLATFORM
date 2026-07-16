import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";

import { useUploadCreatorProfileImageMutation } from "./use-creator-profile-form-mutation";
import type { CreatorProfileItemApi } from "@/features/creators/api/types";
import { convertHeicIfNeeded, isHeicImage } from "@/lib/heic-to-web-image";

export const MAX_PROFILE_IMAGE_BYTES = 10 * 1024 * 1024;
export const PROFILE_IMAGE_ACCEPT =
  "image/jpeg,image/png,image/webp,image/heic,image/heif,.jpg,.jpeg,.png,.webp,.heic,.heif";

function getProfileImageContentType(file: File): string | null {
  const contentType = file.type?.trim();
  if (contentType === "image/jpeg" || contentType === "image/png" || contentType === "image/webp") {
    return contentType;
  }
  const name = file.name.toLowerCase();
  if (name.endsWith(".jpg") || name.endsWith(".jpeg")) return "image/jpeg";
  if (name.endsWith(".png")) return "image/png";
  if (name.endsWith(".webp")) return "image/webp";
  return null;
}

export type UseCreatorProfileImageOptions = {
  mode: "create" | "update";
  profileId?: string;
  initialProfile?: CreatorProfileItemApi | null;
};

export function useCreatorProfileImage({
  mode,
  profileId,
  initialProfile,
}: UseCreatorProfileImageOptions) {
  const uploadMutation = useUploadCreatorProfileImageMutation({
    mode,
    creatorProfileId: profileId,
  });

  const profileImageInputRef = useRef<HTMLInputElement>(null);
  const [profileImagePreviewUrl, setProfileImagePreviewUrl] = useState<
    string | null
  >(() => {
    const url = initialProfile?.profileImageUrl?.trim();
    return url?.startsWith("http://") || url?.startsWith("https://") ? url : null;
  });
  
  const [pendingProfileImageKey, setPendingProfileImageKey] = useState<
    string | null
  >(null);
  const [profileImageRemoved, setProfileImageRemoved] = useState(false);
  const [convertingProfileImage, setConvertingProfileImage] = useState(false);
  const uploadingProfileImage =
    uploadMutation.isPending || convertingProfileImage;

  const handleProfileImageSelected = useCallback(
    async (file: File | null) => {
      if (!file) return;

      let workingFile = file;
      if (isHeicImage(file)) {
        try {
          setConvertingProfileImage(true);
          workingFile = await convertHeicIfNeeded(file, "image/jpeg");
        } catch {
          toast.error("Couldn't process this HEIC photo. Try a JPG or PNG.");
          if (profileImageInputRef.current) {
            profileImageInputRef.current.value = "";
          }
          return;
        } finally {
          setConvertingProfileImage(false);
        }
      }

      const contentType = getProfileImageContentType(workingFile);
      if (!contentType) {
        toast.error("Use JPEG, PNG, or WEBP image.");
        return;
      }
      if (workingFile.size > MAX_PROFILE_IMAGE_BYTES) {
        toast.error("Profile image must be 10 MB or smaller.");
        return;
      }

      uploadMutation.mutate(
        { file: workingFile, contentType },
        {
          onSuccess: (result) => {
            if (!result) return;
            setPendingProfileImageKey(result.key);
            setProfileImagePreviewUrl(result.cdnUrl);
            setProfileImageRemoved(false);
          },
          onSettled: () => {
            if (profileImageInputRef.current) {
              profileImageInputRef.current.value = "";
            }
          },
        },
      );
    },
    [uploadMutation],
  );

  const restoreInitialProfileImage = useCallback(() => {
    setPendingProfileImageKey(null);
    setProfileImageRemoved(false);

    const url = initialProfile?.profileImageUrl?.trim();
    setProfileImagePreviewUrl(
      url?.startsWith("http://") || url?.startsWith("https://")
        ? url
        : null,
    );
  }, [initialProfile?.profileImageUrl]);

  const removeProfileImage = useCallback(() => {
    setPendingProfileImageKey(null);
    setProfileImagePreviewUrl(null);
    setProfileImageRemoved(true);
    if (profileImageInputRef.current) {
      profileImageInputRef.current.value = "";
    }
  }, []);

  return {
    profileImageInputRef,
    profileImagePreviewUrl,
    pendingProfileImageKey,
    profileImageRemoved,
    uploadingProfileImage,
    handleProfileImageSelected,
    restoreInitialProfileImage,
    removeProfileImage,
  };
}
