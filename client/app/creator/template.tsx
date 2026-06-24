import { requireCreatorWorkspace } from "@/lib/server-auth-guard";
import { getServerCallbackPath } from "@/lib/server-callback-path";

export default async function CreatorHubTemplate({
  children,
}: {
  children: React.ReactNode;
}) {
  const callbackPath = await getServerCallbackPath("/creator/orders");
  await requireCreatorWorkspace(callbackPath);

  return <div className="nav-route-enter">{children}</div>;
}
