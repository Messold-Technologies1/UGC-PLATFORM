"use client";

import dynamic from "next/dynamic";
import { PortfolioUploadLoadingShell } from "@/components/dashboard/route-loading-shells";

export const CreatorPortfolioUploadForm = dynamic(
  () =>
    import("./creator-portfolio-upload-form").then((module) => ({
      default: module.CreatorPortfolioUploadForm,
    })),
  {
    loading: () => <PortfolioUploadLoadingShell />,
  },
);
