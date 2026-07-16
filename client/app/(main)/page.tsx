import { redirect } from "next/navigation";
import { LandingPageContent } from "@/components/landing/landing-page-content";
import { fetchServerAuthUserState } from "@/lib/server-auth-guard";

export const dynamic = "force-dynamic";
function canUseWorkspaceRole(
  brandAccessRevoked: boolean | undefined,
  role: "CREATOR" | "BRAND" | "ADMIN" | "AGENCY" | null | undefined,
) {
  if (!role) return false;
  if (role === "AGENCY") return true;
  return role !== "BRAND" || !brandAccessRevoked;
}

function workspacePath(
  role: "CREATOR" | "BRAND" | "ADMIN" | "AGENCY" | null | undefined,
) {
  if (role === "ADMIN") return "/admin";
  if (role === "BRAND" || role === "AGENCY") return "/brand/creators";
  if (role === "CREATOR") return "/creator/orders";
  return null;
}

export default async function Home() {
  // Only forward visitors who are ACTIVELY authenticated (a valid access token
  // makes /me return 200). We deliberately do NOT attempt session-restore here:
  // the public landing must stay reachable, and bouncing off a lingering
  // refresh-token cookie (e.g. right after logout) would send the user through
  // /auth/session-restore instead of showing the page.
  const auth = await fetchServerAuthUserState();
  const user = auth.user;

  let target = canUseWorkspaceRole(
    user?.brandAccessRevoked,
    user?.primaryRole,
  )
    ? workspacePath(user?.primaryRole)
    : null;

  if (!target && user?.roles && user.roles.length > 0) {
    const fallbackRole = user.roles.find((r) => canUseWorkspaceRole(user?.brandAccessRevoked, r));
    if (fallbackRole) {
      target = workspacePath(fallbackRole);
    }
  }

  if (target) {
    redirect(target);
  }

  return <LandingPageContent />;
}
