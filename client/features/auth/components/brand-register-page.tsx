"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AuthLogoLink } from "./auth-logo-link";
import { BrandRegisterForm, brandEyebrow } from "./brand-register-form";

/**
 * Brand signup shell (/register/brand).
 *
 * Owns the page chrome from the Brand Registration design — sticky header,
 * the headline above the form, the sticky right rail, and the footer links.
 * The signup flow itself lives in BrandRegisterForm.
 *
 * This surface is deliberately quieter than the creator side: a restrained
 * plum accent on warm neutrals, 1px hairlines and 11–12px radii rather than
 * the marketing pages' 2px borders and hard shadows.
 */

const BENEFITS = [
  {
    title: "Discover creators faster",
    note: "Search by category, city, budget and delivery time instead of scrolling Instagram.",
  },
  {
    title: "Streamline your workflow",
    note: "Brief, approve and track every deliverable from one dashboard.",
  },
  {
    title: "Secure payments, always",
    note: "Protected transactions on every collaboration.",
  },
  {
    title: "Build a content engine",
    note: "Save creators you like, reuse briefs, scale what works.",
  },
];

export function BrandRegisterPage() {
  const searchParams = useSearchParams();
  /* Keep the post-login redirect intact — the form used to own this link. */
  const callbackUrl = searchParams.get("callbackUrl");
  const loginHref = `/login?role=brand${
    callbackUrl ? `&callbackUrl=${encodeURIComponent(callbackUrl)}` : ""
  }`;

  return (
    <div className="text-foreground min-h-screen bg-white">
      <header className="border-foreground/10 sticky top-0 z-40 border-b bg-white/86 backdrop-blur-[14px]">
        <div className="mx-auto flex max-w-[1160px] flex-wrap items-center justify-between gap-4 px-6 py-[15px]">
          <div className="flex items-center gap-[13px]">
            {/* The design's wordmark is 20px; brand-logo.png carries more padding,
                so it needs more height to read the same. */}
            <AuthLogoLink imageClassName="h-8" />
            <span className="bg-foreground/16 h-[17px] w-px" />
            <span className={brandEyebrow}>Brand sign up</span>
          </div>
          <span className="text-muted-foreground text-[13.5px]">
            Already have an account?{" "}
            <Link
              href={loginHref}
              className="text-plum-700 font-semibold hover:underline"
            >
              Log in as Brand
            </Link>
          </span>
        </div>
      </header>

      <div className="mx-auto max-w-[1160px] px-6 pt-[clamp(34px,4.5vw,64px)] pb-[clamp(56px,7vw,96px)]">
        <div className="grid items-start gap-[clamp(36px,5vw,76px)] lg:grid-cols-[1.08fr_0.92fr]">
          <div>
            <h1 className="font-heading mb-3.5 text-[clamp(2rem,3.6vw,2.7rem)] leading-[1.06] font-bold tracking-[-0.03em] text-balance">
              Create your brand profile
            </h1>
            <p className="text-muted-foreground mb-[clamp(30px,3.6vw,42px)] max-w-[480px] text-[16.5px] leading-relaxed text-pretty">
              Brand name, categories and the rest can wait — add them from your
              profile whenever you like.
            </p>

            <BrandRegisterForm />

            <div className="border-foreground/10 text-muted-foreground mt-[34px] flex flex-wrap items-center justify-between gap-4 border-t pt-6 text-[13.5px]">
              <span>
                Already have an account?{" "}
                <Link
                  href={loginHref}
                  className="text-plum-700 font-semibold hover:underline"
                >
                  Log in as Brand
                </Link>
              </span>
              <span>
                Are you a creator?{" "}
                <Link
                  href="/register/creator"
                  className="text-plum-700 hover:underline"
                >
                  Sign up as a creator
                </Link>
              </span>
            </div>
          </div>

          {/* RAIL */}
          <div>
            <div className="lg:sticky lg:top-25">
              <div className="border-plum-150 bg-plum-50 rounded-[20px] border p-[clamp(26px,3vw,34px)]">
                <div className={`${brandEyebrow} mb-5`}>Free to explore</div>
                <h2 className="font-heading mb-3.5 text-[clamp(1.3rem,2.2vw,1.65rem)] leading-[1.18] font-bold tracking-[-0.03em] text-balance">
                  Manage creator collaborations without the chaos.
                </h2>
                <p className="text-muted-foreground mb-2 text-[15px] leading-relaxed text-pretty">
                  Everything you need to find creators, manage projects and get
                  content that performs — in one place.
                </p>
                <div className="flex flex-col">
                  {BENEFITS.map((b) => (
                    <div
                      key={b.title}
                      className="border-plum-150 border-t py-4"
                    >
                      <div className="mb-1 text-[15px] font-semibold">
                        {b.title}
                      </div>
                      <div className="text-muted-foreground text-[13.5px] leading-[1.5]">
                        {b.note}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-foreground/10 mt-7 hidden border-t pt-[26px] sm:block">
                <div className={`${brandEyebrow} mb-[13px]`}>
                  No card, no commitment
                </div>
                <p className="text-muted-foreground text-[14.5px] leading-[1.62] text-pretty">
                  Creating an account just gets you into the marketplace.
                  You&rsquo;ll see every creator&rsquo;s pricing and delivery
                  time before you order anything.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
