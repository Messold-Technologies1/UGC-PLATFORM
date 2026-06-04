import { useCallback, useState } from "react";
import { toast } from "sonner";

import {
  createInitialPackageDraft,
  PACKAGE_PRICE_STEP,
  PACKAGE_DELIVERY_DAYS,
  type PackageDraft,
} from "./creator-profile-form-utils";
import type { CreatorPackageCreatePayload } from "@/features/creators/api/create-creator-profile";
import type { CreatorProfileItemApi } from "@/features/creators/api/types";

export type UseCreatorPackagesFormOptions = {
  initialProfile?: CreatorProfileItemApi | null;
};

export function useCreatorPackagesForm({
  initialProfile,
}: UseCreatorPackagesFormOptions) {
  const [packageDraft, setPackageDraft] = useState<PackageDraft>(() =>
    createInitialPackageDraft(initialProfile),
  );

  const buildPackages = useCallback(():
    | CreatorPackageCreatePayload[]
    | null => {
    const packageName = packageDraft.packageName.trim();
    const videoLength = Number(packageDraft.videoLengthSeconds);
    const price = packageDraft.priceAmount.trim();
    const priceNumber = Number(price);
    const revisions = Number(packageDraft.maxRevisions);

    if (!packageName) {
      toast.error("Package name is required.");
      return null;
    }
    if (!Number.isInteger(videoLength) || videoLength < 1 || videoLength > 60) {
      toast.error("Video length must be between 1 and 60 seconds.");
      return null;
    }
    if (!/^\d+$/.test(price)) {
      toast.error("Package price must be a whole number.");
      return null;
    }
    if (
      !Number.isInteger(priceNumber) ||
      priceNumber < PACKAGE_PRICE_STEP ||
      priceNumber % PACKAGE_PRICE_STEP !== 0
    ) {
      toast.error("Package price must be at least ₹500 and in steps of ₹500.");
      return null;
    }
    if (!Number.isInteger(revisions) || revisions < 1) {
      toast.error("Package revisions must be at least 1.");
      return null;
    }

    const deliverables = packageDraft.basicEditing
      ? ["1 Video", "Basic editing"]
      : ["1 Video"];

    return [
      {
        name: packageName,
        deliverables,
        videoLengthSeconds: videoLength,
        basicEditing: packageDraft.basicEditing,
        priceAmount: price,
        deliveryDays: PACKAGE_DELIVERY_DAYS,
        maxRevisions: revisions,
      },
    ];
  }, [packageDraft]);

  return {
    packageDraft,
    setPackageDraft,
    buildPackages,
  };
}
