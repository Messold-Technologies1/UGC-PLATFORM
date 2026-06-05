import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";
import { useUploadBrandLogoMutation } from "./use-brand-profile-form-mutation";
import { MAX_LOGO_BYTES, LOGO_ACCEPT } from "./brand-profile-form-utils";
import type { BrandProfileItemApi } from "@/features/brands/api/types";

export type UseBrandLogoFormOptions = {
  mode: "create" | "update";
  initialProfile?: BrandProfileItemApi | null;
};

export function useBrandLogoForm({
  mode,
  initialProfile,
}: UseBrandLogoFormOptions) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(
    initialProfile?.logoUrl ?? null,
  );
  const [pendingLogoKey, setPendingLogoKey] = useState<string | null>(
    initialProfile?.logoKey ?? null,
  );

  const uploadBrandLogoMutation = useUploadBrandLogoMutation(mode);
  const uploadingLogo = uploadBrandLogoMutation.isPending;

  const handleLogoSelected = useCallback(
    async (file: File | null) => {
      if (!file) return;

      if (!LOGO_ACCEPT.split(",").includes(file.type)) {
        toast.error("Use JPEG, PNG, WebP, or GIF.");
        return;
      }
      if (file.size > MAX_LOGO_BYTES) {
        toast.error("Logo must be 8 MB or smaller.");
        return;
      }

      uploadBrandLogoMutation.mutate(file, {
        onSuccess: (result) => {
          if (!result) return;
          setPendingLogoKey(result.key);
          setLogoPreviewUrl(result.cdnUrl);
        },
        onSettled: () => {
          if (fileInputRef.current) fileInputRef.current.value = "";
        },
      });
    },
    [uploadBrandLogoMutation],
  );

  const clearLogo = useCallback(() => {
    setPendingLogoKey(null);
    setLogoPreviewUrl(null);
  }, []);

  return {
    fileInputRef,
    logoPreviewUrl,
    pendingLogoKey,
    uploadingLogo,
    handleLogoSelected,
    clearLogo,
  };
}
