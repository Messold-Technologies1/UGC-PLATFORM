"use client";

import Link from "next/link";
import { CreatorRegisterForm } from "./creator-register-form";

/**
 * Creator signup shell (/register/creator).
 *
 * Owns the page chrome from the Creator Registration design — the headline
 * above the form and the sticky right-hand rail. The form itself stays in
 * CreatorRegisterForm.
 */

const LINK_CARRIES = [
  "Your work",
  "Your rates",
  "Your services",
  "Delivery time",
  "Add-ons",
  "Reviews",
];

const NEXT_STEPS = [
  {
    n: "01",
    title: "Add your work",
    note: "Four to six pieces is enough to start getting found.",
  },
  {
    n: "02",
    title: "Set your rates and services",
    note: "Your price, your delivery time, your add-ons — all editable later.",
  },
  {
    n: "03",
    title: "Publish and share your link",
    note: "One URL for your Instagram bio and every brand enquiry.",
  },
];

const railCard = "hidden sm:block";

export function CreatorRegisterPage() {
  return (
    <div className="text-foreground relative min-h-screen bg-[linear-gradient(180deg,#FFFFFF_0%,#FFFBFB_58%,#FFF7F9_100%)]">
      <div className="mx-auto max-w-[1180px] px-5 md:pt-6 pb-[clamp(48px,7vw,88px)]">
        <div className="grid items-start gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:gap-x-20">
          {/* FORM */}
          <div>
            <h1 className="mb-2 text-[1.5rem] leading-tight font-bold tracking-[-0.03em] md:text-left text-center text-balance sm:text-[1.7rem]">
              Create your creator profile
            </h1>
            <p className="text-muted-foreground mb-6 max-w-[460px] text-sm leading-relaxed text-pretty text-center md:text-left">
              Takes a minute to start. Your work, rates, and services come
              after — you stay in control of all of it.
            </p>

            <CreatorRegisterForm />

            <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
              <span className="text-muted-foreground text-[13px]">
                Already a creator?{" "}
                <Link
                  href="/login?role=creator"
                  className="font-medium text-deep-pink hover:underline"
                >
                  Log in
                </Link>
              </span>
              <span className="text-muted-foreground text-[13px]">
                Hiring creators?{" "}
                <Link
                  href="/register/brand"
                  className="font-medium text-deep-pink hover:underline"
                >
                  Sign up as a brand
                </Link>
              </span>
            </div>
          </div>

          {/* RAIL */}
          <div>
            <div className="lg:sticky lg:top-24">
              <div className="rounded-2xl border border-deep-pink/30 bg-[#FFF5F7] px-8 py-8 sm:px-9 sm:py-9">
                <p className="mb-6 text-[22px] leading-[1.2] font-bold tracking-[-0.03em] text-[#181313] sm:text-[24px]">
                  The last time you&rsquo;ll type
                  <br />
                  your rates into a DM.
                </p>

                <div className="mb-7 flex flex-col gap-2">
                  <div className="max-w-[88%] self-start rounded-[18px_18px_18px_5px] border border-[#EDE8EA] bg-white px-4 py-3 text-[14px] leading-snug text-[#6F6A6E]">
                    Hi! Can you share your portfolio, rates and delivery time?
                  </div>
                  <div className="max-w-[90%] self-end rounded-[18px_18px_5px_18px] bg-[#181313] px-4 py-2.5 text-[13.5px] leading-snug text-white">
                    Everything&rsquo;s here →{" "}
                    <span className="font-medium underline underline-offset-2">
                      gocollab.in/yourname
                    </span>
                  </div>
                </div>

                <div>
                  <div className="mb-3.5 text-[11px] font-bold tracking-[0.14em] text-[#8B8489] uppercase">
                    That one link carries
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {LINK_CARRIES.map((c) => (
                      <span
                        key={c}
                        className="rounded-full border border-[#E8E4E6] bg-white px-3.5 py-1.5 text-[13.5px] font-medium text-[#181313]"
                      >
                        {c}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className={`${railCard} mt-8 border-t border-[#E8E4E6] pt-8`}>
                <div className="mb-5 text-[11px] font-bold tracking-[0.14em] text-[#8B8489] uppercase">
                  Right after you sign up
                </div>
                <div className="flex flex-col gap-5">
                  {NEXT_STEPS.map((n) => (
                    <div key={n.n} className="flex items-start gap-3">
                      <span className="shrink-0 text-[15px] font-bold text-deep-pink">
                        {n.n}
                      </span>
                      <div>
                        <div className="text-[15px] font-bold text-[#181313]">
                          {n.title}
                        </div>
                        <div className="mt-0.5 text-[14px] leading-snug text-[#8B8489]">
                          {n.note}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <p className="mt-6 text-[13px] text-[#8B8489]">
                  Most creators finish in under 15 minutes.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
