import { useCallback, useState } from "react";
import { toast } from "sonner";

import {
  createInitialPackageDraft,
  PACKAGE_DEFAULT_MAX_REVISIONS,
  PACKAGE_MAX_DELIVERY_DAYS,
  PACKAGE_MIN_DELIVERY_DAYS,
  PACKAGE_NAME,
  PACKAGE_PRICE_STEP,
  PACKAGE_VIDEO_LENGTH_SECONDS,
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
    const price = packageDraft.priceAmount.trim();
    const priceNumber = Number(price);
    const deliveryDays = Number(packageDraft.deliveryDays);
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
    if (
      !Number.isInteger(deliveryDays) ||
      deliveryDays < PACKAGE_MIN_DELIVERY_DAYS ||
      deliveryDays > PACKAGE_MAX_DELIVERY_DAYS
    ) {
      toast.error(
        `Delivery time must be between ${PACKAGE_MIN_DELIVERY_DAYS} and ${PACKAGE_MAX_DELIVERY_DAYS} days.`,
      );
      return null;
    }
    // Every Standard package includes the edited video and the raw clips.
    const deliverables = ["1 Video", "Basic editing", "Raw footage", "1080p minimum"];

    return [
      {
        name: PACKAGE_NAME,
        deliverables,
        videoLengthSeconds: PACKAGE_VIDEO_LENGTH_SECONDS,
        basicEditing: true,
        priceAmount: price,
        deliveryDays,
        maxRevisions: PACKAGE_DEFAULT_MAX_REVISIONS,
      },
    ];
  }, [packageDraft]);

  return {
    packageDraft,
    setPackageDraft,
    buildPackages,
  };
}
