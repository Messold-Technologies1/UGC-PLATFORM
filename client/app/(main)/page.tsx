import { redirect } from "next/navigation";
import { LandingPageContent } from "@/components/landing/landing-page-content";
import {
  fetchServerAuthUserState,
  redirectToSessionRestoreIfPossible,
} from "@/lib/server-auth-guard";

export const dynamic = "force-dynamic";
function canUseWorkspaceRole(
  brandAccessRevoked: boolean | undefined,
  role: "CREATOR" | "BRAND" | "ADMIN" | null | undefined,
) {
  if (!role) return false;
  return role !== "BRAND" || !brandAccessRevoked;
}

function workspacePath(role: "CREATOR" | "BRAND" | "ADMIN" | null | undefined) {
  if (role === "ADMIN") return "/admin";
  if (role === "BRAND") return "/brand/creators";
  if (role === "CREATOR") return "/creator/orders";
  return null;
}

export default async function Home() {
  const auth = await fetchServerAuthUserState();
  const user = auth.user;

  if (!user && auth.status === "unauthenticated") {
    await redirectToSessionRestoreIfPossible("/", "/");
  }

  const target = canUseWorkspaceRole(
    user?.brandAccessRevoked,
    user?.primaryRole,
  )
    ? workspacePath(user?.primaryRole)
    : null;

  if (target) {
    redirect(target);
  }

  return <LandingPageContent />;
}
