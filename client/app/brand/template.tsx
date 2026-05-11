import { requireBrandWorkspace } from "@/lib/server-auth-guard";

export default async function BrandHubTemplate({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireBrandWorkspace("/brand/creators");

  return <div className="nav-route-enter">{children}</div>;
}
