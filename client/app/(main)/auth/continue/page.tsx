import { Suspense } from "react";
import { LandingPageContent } from "@/components/landing/landing-page-content";
import { AuthContinueBackground } from "./auth-continue-background";
import { AuthContinueOverlay } from "./auth-continue-overlay";

export const dynamic = "force-dynamic";

export default function AuthContinuePage() {
  return (
    <>
      <LandingPageContent />
      <Suspense fallback={null}>
        <AuthContinueBackground />
      </Suspense>
      <Suspense fallback={null}>
        <AuthContinueOverlay />
      </Suspense>
    </>
  );
}
