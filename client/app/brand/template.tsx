import { requireBrandWorkspace } from "@/lib/server-auth-guard";
import { getServerCallbackPath } from "@/lib/server-callback-path";

export default async function BrandHubTemplate({
  children,
}: {
  children: React.ReactNode;
}) {
  // Preserve the originally-requested brand deep link (e.g. /brand/orders/<id>
  // from an email/WhatsApp button) through login, mirroring the creator guard.
  // Without this the real path was dropped and every brand deep link landed on
  // /brand/creators after login.
  const callbackPath = await getServerCallbackPath("/brand/creators");
  await requireBrandWorkspace(callbackPath);

  return <div className="nav-route-enter">{children}</div>;
}
