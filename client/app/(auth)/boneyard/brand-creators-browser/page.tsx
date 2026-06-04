import { notFound } from "next/navigation";
import { BrandCreatorsLoadingState } from "@/features/brands/components/brand-creators-loading";
import { BoneyardDashboardPreviewShell } from "../preview-shells";

export const dynamic = "force-dynamic";

export default function BrandCreatorsBrowserPreviewPage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  return (
    <BoneyardDashboardPreviewShell>
      <BrandCreatorsLoadingState />
    </BoneyardDashboardPreviewShell>
  );
}
