import { redirect } from "next/navigation";
import { LandingPageContent } from "@/components/landing/landing-page-content";
import {
  fetchServerAuthUserState,
  redirectToSessionRestoreIfPossible,
} from "@/lib/server-auth-guard";

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
  const auth = await fetchServerAuthUserState();
  const user = auth.user;

  if (!user && auth.status === "unauthenticated") {
    await redirectToSessionRestoreIfPossible("/", "/");
  }

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
