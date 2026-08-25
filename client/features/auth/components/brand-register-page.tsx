"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { BrandRegisterForm, brandEyebrow } from "./brand-register-form";

/**
 * Brand signup shell (/register/brand).
 *
 * Owns the page chrome — headline, sticky right rail, and footer links.
 * Navbar + AuthProvider live in the route layout, same as creator signup.
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
    <div className="text-foreground bg-white">
      <div className="mx-auto flex min-h-[calc(100dvh-6.5rem)] max-w-[1160px] items-center p-6">
        <div className="grid w-full gap-10 lg:grid-cols-[1.08fr_0.92fr] lg:items-center lg:gap-x-20">
          <div className="mx-auto w-full max-w-[520px] lg:mx-0 lg:max-w-none">
            <h1 className="mb-2 text-center text-[1.5rem] leading-tight font-bold tracking-[-0.03em] text-balance sm:text-[1.7rem] md:text-left">
              Create your brand profile
            </h1>
            <p className="text-muted-foreground mb-6 max-w-[460px] text-center text-sm leading-relaxed text-pretty md:text-left">
              Brand name, categories and the rest can wait — add them from
              your profile whenever you like.
            </p>

            <BrandRegisterForm />

            <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
              <span className="text-muted-foreground text-[13px]">
                Already have an account?{" "}
                <Link
                  href={loginHref}
                    className="font-medium text-plum-700 hover:underline"
                  >
                    Log in as Brand
                </Link>
              </span>
              <span className="text-muted-foreground text-[13px]">
                Are you a creator?{" "}
                <Link
                  href="/register/creator"
                    className="font-medium text-plum-700 hover:underline"
                  >
                    Sign up as a creator
                </Link>
              </span>
            </div>
          </div>

          <div className="lg:py-2">
            <div className="lg:sticky lg:top-25">
              <div className="border-plum-150 bg-plum-50 rounded-[20px] border p-[clamp(26px,3vw,34px)]">
                <div className={`${brandEyebrow} mb-5`}>Free to explore</div>
                <h2 className="font-heading mb-3.5 text-[clamp(1.3rem,2.2vw,1.65rem)] leading-[1.18] font-bold tracking-[-0.03em] text-balance">
                  Manage creator collaborations without the chaos.
                </h2>
                <p className="text-muted-foreground mb-2 text-[15px] leading-relaxed text-pretty">
                  Everything you need to find creators, manage projects and
                  get content that performs — in one place.
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
                      <div className="text-muted-foreground text-[13.5px] leading-normal">
                        {b.note}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-foreground/10 mt-7 hidden border-t pt-6 sm:block">
                <div className={`${brandEyebrow} mb-3`}>
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
