import type { Metadata } from "next";
import { CreatorPortfolioUploadForm } from "@/features/creator-portfolio/components/creator-portfolio-upload-form.lazy";

export const metadata: Metadata = { title: "Add portfolio video" };

export default function CreatorPortfolioUploadPage() {
  return <CreatorPortfolioUploadForm />;
}
