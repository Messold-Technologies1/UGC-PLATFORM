"use client";

import dynamic from "next/dynamic";
import { CreatorsBrowserLoadingShell } from "@/components/dashboard/route-loading-shells";

export type { BrandCreatorsBrowserProps } from "./brand-creators-browser";

export const BrandCreatorsBrowser = dynamic(
  () =>
    import("./brand-creators-browser").then((module) => ({
      default: module.BrandCreatorsBrowser,
    })),
  {
    loading: () => <CreatorsBrowserLoadingShell />,
  },
);
