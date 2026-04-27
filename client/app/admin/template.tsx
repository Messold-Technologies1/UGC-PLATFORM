import { requireAdminWorkspace } from "@/lib/server-auth-guard";

export default async function AdminTemplate({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdminWorkspace("/admin");

  return children;
}
