import { LandingPageContent } from "@/components/landing/landing-page-content";

export const dynamic = "force-dynamic";

export default function Home() {
  // `/` is the public marketing landing. The navbar logo (and other home
  // links) must land here even after a creator/brand session, instead of
  // bouncing through `/creator/account` into `/login?callbackUrl=…`.
  return <LandingPageContent />;
}
