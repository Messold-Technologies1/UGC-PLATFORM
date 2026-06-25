import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";

import {
  MAX_INTRO_VIDEO_BYTES,
  getInitialCreatorIntroVideoPreviewUrl,
  getIntroVideoContentType,
} from "./creator-profile-form-utils";
import { useUploadCreatorIntroVideoMutation } from "./use-creator-profile-form-mutation";
import type { CreatorProfileItemApi } from "@/features/creators/api/types";

export type UseCreatorIntroVideoOptions = {
  mode: "create" | "update";
  profileId?: string;
  initialProfile?: CreatorProfileItemApi | null;
};

export function useCreatorIntroVideo({
  mode,
  profileId,
  initialProfile,
}: UseCreatorIntroVideoOptions) {
  const uploadCreatorIntroVideoMutation = useUploadCreatorIntroVideoMutation({
    mode,
    creatorProfileId: profileId,
  });

  const introVideoInputRef = useRef<HTMLInputElement>(null);
  const [introVideoPreviewUrl, setIntroVideoPreviewUrl] = useState<
    string | null
  >(() => getInitialCreatorIntroVideoPreviewUrl(initialProfile));
  const [pendingIntroVideoKey, setPendingIntroVideoKey] = useState<
    string | null
  >(null);
  const [introVideoRemoved, setIntroVideoRemoved] = useState(false);
  const uploadingIntroVideo = uploadCreatorIntroVideoMutation.isPending;

  const handleIntroVideoSelected = useCallback(
    async (file: File | null) => {
      if (!file) return;

      const contentType = getIntroVideoContentType(file);
      if (!contentType) {
        toast.error("Use MP4, MOV, or WebM video.");
        return;
      }
      if (file.size > MAX_INTRO_VIDEO_BYTES) {
        toast.error("Video must be 200 MB or smaller.");
        return;
      }

      uploadCreatorIntroVideoMutation.mutate(
        { file, contentType },
        {
          onSuccess: (result) => {
            if (!result) return;
            setPendingIntroVideoKey(result.key);
            setIntroVideoPreviewUrl(result.cdnUrl);
            setIntroVideoRemoved(false);
          },
          onSettled: () => {
            if (introVideoInputRef.current) {
              introVideoInputRef.current.value = "";
            }
          },
        },
      );
    },
    [uploadCreatorIntroVideoMutation],
  );

  const restoreInitialIntroVideo = useCallback(() => {
    setPendingIntroVideoKey(null);
    setIntroVideoRemoved(false);

    const url = initialProfile?.introVideoUrl?.trim();
    setIntroVideoPreviewUrl(
      url?.startsWith("http://") || url?.startsWith("https://")
        ? url
        : null,
    );
  }, [initialProfile?.introVideoUrl]);

  const removeIntroVideo = useCallback(() => {
    setPendingIntroVideoKey(null);
    setIntroVideoPreviewUrl(null);
    setIntroVideoRemoved(true);
    if (introVideoInputRef.current) {
      introVideoInputRef.current.value = "";
    }
  }, []);

  return {
    introVideoInputRef,
    introVideoPreviewUrl,
    pendingIntroVideoKey,
    introVideoRemoved,
    uploadingIntroVideo,
    handleIntroVideoSelected,
    restoreInitialIntroVideo,
    removeIntroVideo,
  };
}
