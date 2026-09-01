import { redirect } from "next/navigation";
import { LandingPageContent } from "@/components/landing/landing-page-content";
import { resolveLandingWorkspacePath } from "@/features/auth/lib/post-auth-destination";
import {
  fetchServerAuthUserState,
  redirectToHomeSessionRestoreIfPossible,
} from "@/lib/server-auth-guard";

export const dynamic = "force-dynamic";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const skipRestore = params.noRestore === "1";

  const auth = await fetchServerAuthUserState();
  const target = resolveLandingWorkspacePath(auth.user);

  if (target) {
    redirect(target);
  }

  // Access expired, refresh still valid: restore once and go to the workspace.
  // Do not retry when we already bounced here from a failed restore.
  if (!skipRestore && auth.status === "unauthenticated") {
    await redirectToHomeSessionRestoreIfPossible();
  }

  return <LandingPageContent />;
}
