"use client";

import dynamic from "next/dynamic";
import { PortfolioLoadingShell } from "@/components/dashboard/route-loading-shells";

export const CreatorPortfolioManager = dynamic(
  () =>
    import("./creator-portfolio-manager").then((module) => ({
      default: module.CreatorPortfolioManager,
    })),
  {
    loading: () => <PortfolioLoadingShell />,
  },
);
