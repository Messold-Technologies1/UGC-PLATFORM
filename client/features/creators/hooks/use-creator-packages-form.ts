import { useCallback, useState } from "react";
import { toast } from "sonner";

import {
  createInitialPackageDraft,
  PACKAGE_DEFAULT_MAX_REVISIONS,
  PACKAGE_MAX_DELIVERY_DAYS,
  PACKAGE_MAX_VIDEO_LENGTH_SECONDS,
  PACKAGE_MIN_DELIVERY_DAYS,
  PACKAGE_NAME,
  PACKAGE_PRICE_STEP,
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
    const videoLength = Number(packageDraft.videoLengthSeconds);
    const price = packageDraft.priceAmount.trim();
    const priceNumber = Number(price);
    const deliveryDays = Number(packageDraft.deliveryDays);

    if (
      !Number.isInteger(videoLength) ||
      videoLength < 1 ||
      videoLength > PACKAGE_MAX_VIDEO_LENGTH_SECONDS
    ) {
      toast.error(
        `Video length must be between 1 and ${PACKAGE_MAX_VIDEO_LENGTH_SECONDS} seconds.`,
      );
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
    // Basic editing is always included — creators must submit edited video.
    const deliverables = ["1 Video", "Basic editing"];

    return [
      {
        name: PACKAGE_NAME,
        deliverables,
        videoLengthSeconds: videoLength,
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
