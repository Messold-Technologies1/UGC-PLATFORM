import { Suspense } from "react";
import { LandingPageContent } from "@/components/landing/landing-page-content";
import { AuthContinueOverlay } from "./auth-continue-overlay";

export default function AuthContinuePage() {
  return (
    <>
      <LandingPageContent />
      <Suspense fallback={null}>
        <AuthContinueOverlay />
      </Suspense>
    </>
  );
}
