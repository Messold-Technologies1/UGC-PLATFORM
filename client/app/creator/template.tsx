import { requireCreatorWorkspace } from "@/lib/server-auth-guard";

export default async function CreatorHubTemplate({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireCreatorWorkspace("/creator/orders");

  return <div className="nav-route-enter">{children}</div>;
}
