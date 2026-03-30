import type { Metadata } from "next";
import { CreatorPortfolioManager } from "@/features/creator-portfolio/components/creator-portfolio-manager";

export const metadata: Metadata = { title: "Portfolio" };

export default function CreatorPortfolioPage() {
  return <CreatorPortfolioManager />;
}
