import { requireBrandWorkspace } from "@/lib/server-auth-guard";
import { getServerCallbackPath } from "@/lib/server-callback-path";

export default async function BrandHubTemplate({
  children,
}: {
  children: React.ReactNode;
}) {
  const callbackPath = await getServerCallbackPath("/brand/creators");
  await requireBrandWorkspace(callbackPath);

  return <div className="nav-route-enter">{children}</div>;
}
