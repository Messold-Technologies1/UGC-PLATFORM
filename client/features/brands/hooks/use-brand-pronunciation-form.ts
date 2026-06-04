import { useCallback, useState } from "react";
import { useUploadBrandPronunciationMutation } from "./use-brand-profile-form-mutation";
import type { BrandProfileItemApi } from "@/features/brands/api/types";

export type UseBrandPronunciationFormOptions = {
  mode: "create" | "update";
  initialProfile?: BrandProfileItemApi | null;
};

export function useBrandPronunciationForm({
  mode,
  initialProfile,
}: UseBrandPronunciationFormOptions) {
  const [pendingPronunciationAudioKey, setPendingPronunciationAudioKey] =
    useState<string | null>(initialProfile?.brandPronunciationAudioKey ?? null);
  const [pronunciationAudioPreviewUrl, setPronunciationAudioPreviewUrl] =
    useState<string | null>(initialProfile?.brandPronunciationAudioUrl ?? null);

  const uploadPronunciationMutation = useUploadBrandPronunciationMutation(mode);
  const uploadingPronunciation = uploadPronunciationMutation.isPending;

  const handlePronunciationBlob = useCallback(
    (blob: Blob) => {
      uploadPronunciationMutation.mutate(blob, {
        onSuccess: (result) => {
          if (!result) return;
          setPendingPronunciationAudioKey(result.key);
          setPronunciationAudioPreviewUrl(result.cdnUrl);
        },
      });
    },
    [uploadPronunciationMutation],
  );

  const clearPronunciationAudio = useCallback(() => {
    setPendingPronunciationAudioKey(null);
    setPronunciationAudioPreviewUrl(null);
  }, []);

  return {
    pendingPronunciationAudioKey,
    pronunciationAudioPreviewUrl,
    uploadingPronunciation,
    handlePronunciationBlob,
    clearPronunciationAudio,
  };
}
