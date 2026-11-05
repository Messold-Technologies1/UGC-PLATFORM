import { redirect } from "next/navigation";
import { LandingPageContent } from "@/components/landing/landing-page-content";
import { MARKETING_FAQS } from "@/components/landing/marketing/marketing-faqs";
import { JsonLd } from "@/components/seo/json-ld";
import { resolveLandingWorkspacePath } from "@/features/auth/lib/post-auth-destination";
import {
  faqPageSchema,
  organizationSchema,
  websiteSchema,
} from "@/lib/seo/structured-data";
import {
  fetchServerAuthUserState,
  redirectToHomeSessionRestoreIfPossible,
} from "@/lib/server-auth-guard";

export const dynamic = "force-dynamic";

/** Keeps the marketing page reachable, and makes a redirect loop impossible. */
function staysOnLanding(params: Record<string, string | string[] | undefined>) {
  // `noRestore=1` is what a failed session restore already falls back to, so
  // honouring it here is what stops restore → `/` → restore going round.
  return Boolean(params.stay ?? params.noRestore);
}

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;

  // `/` stays the public marketing page for visitors who are not signed in —
  // and for anyone who asks for it with ?stay=1, which is also what keeps the
  // navbar logo usable from inside a workspace.
  //
  // Someone with a session gets taken to the part of the product they
  // actually use instead: reopening a closed tab should not land a working
  // brand or creator back on a sales page.
  if (!staysOnLanding(params)) {
    const { user } = await fetchServerAuthUserState();
    const destination = user ? resolveLandingWorkspacePath(user) : null;
    if (destination) redirect(destination);

    // No usable identity, but a refresh cookie may still be alive — the access
    // token only lasts fifteen minutes, so a tab reopened the next morning
    // looks signed out until it is restored. Restoring lands on the workspace;
    // failing lands on `/?noRestore=1`, which the guard above lets through.
    if (!user) await redirectToHomeSessionRestoreIfPossible();
  }

  // Structured data lives on `/` because this is the page the markup
  // describes: it is the canonical home URL for Organization and WebSite, and
  // it renders the FAQ the FAQPage graph marks up. A signed-in visitor is
  // redirected above and never reaches this, which is fine — crawlers arrive
  // without a session.
  //
  // No SearchAction is emitted with the WebSite graph. The sitelinks searchbox
  // it feeds needs a URL that performs a search, and no route takes a search
  // term from the URL yet: `/creators` is a marketing page, and the browse
  // list at `/brand/creators` reads only `?creatorId=`. Once a crawlable
  // route accepts a query parameter, add `potentialAction` in
  // lib/seo/structured-data.ts.
  return (
    <>
      <JsonLd id="ld-organization" schema={organizationSchema()} />
      <JsonLd id="ld-website" schema={websiteSchema()} />
      <JsonLd id="ld-faq" schema={faqPageSchema(MARKETING_FAQS)} />
      <LandingPageContent />
    </>
  );
}
