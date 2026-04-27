"use client";

import dynamic from "next/dynamic";
import { BrandCreatorsLoadingState } from "./brand-creators-loading";

export type { BrandCreatorsBrowserProps } from "./brand-creators-browser";

export const BrandCreatorsBrowser = dynamic(
  () =>
    import("./brand-creators-browser").then((module) => ({
      default: module.BrandCreatorsBrowser,
    })),
  {
    loading: () => <BrandCreatorsLoadingState />,
  },
);
