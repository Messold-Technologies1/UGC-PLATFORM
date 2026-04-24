import { notFound } from "next/navigation";
import { AdminBrandManagementLoadingState } from "@/features/admin/components/admin-brand-management-loading";
import { BoneyardAdminPreviewShell } from "../preview-shells";

export const dynamic = "force-dynamic";

export default function AdminBrandManagementPreviewPage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  return (
    <BoneyardAdminPreviewShell>
      <AdminBrandManagementLoadingState />
    </BoneyardAdminPreviewShell>
  );
}
