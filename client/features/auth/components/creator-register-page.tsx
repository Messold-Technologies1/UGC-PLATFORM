"use client";

import Link from "next/link";
import { Check } from "lucide-react";
import { CreatorRegisterForm } from "./creator-register-form";

/**
 * Creator signup shell (/register/creator).
 *
 * Owns the page chrome — headline above the form and the sticky right-hand
 * rail. The form itself stays in CreatorRegisterForm.
 */

const BENEFITS = [
  {
    title: "Brands find you",
    note: "Search by category, city and budget — you show up when you match.",
  },
  {
    title: "The order arrives ready",
    note: "Brief, price and due date in one place. No rate-card ping-pong.",
  },
  {
    title: "Payout when you deliver",
    note: "Held when the brand books you, released after you deliver.",
  },
];

const EARN_STEPS = [
  {
    n: "01",
    title: "Go live",
    note: "Add your work, rates and delivery time. Brands can find you the same day.",
  },
  {
    n: "02",
    title: "Get the order",
    note: "A brand books a package. You accept and start — no chasing, no unpaid samples.",
  },
  {
    n: "03",
    title: "Create. Get paid.",
    note: "Deliver the content. Protected payout follows according to platform policy.",
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
            <h1 className="mb-2 text-center text-[1.5rem] leading-tight font-bold tracking-[-0.03em] text-balance sm:text-[1.7rem] md:text-left">
              Create your creator profile
            </h1>
            <p className="text-muted-foreground mb-6 max-w-[460px] text-center text-sm leading-relaxed text-pretty md:text-left">
              Takes a minute to start. Once you&rsquo;re live, brands can find
              you and place orders — you stay in control of rates and work.
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
              <div className="rounded-2xl border border-deep-pink/30 bg-[#FFF5F7] px-6 py-5 sm:px-7 sm:py-6">
                <p className="mb-4 text-[20px] leading-[1.2] font-bold tracking-[-0.03em] text-[#181313] sm:text-[22px]">
                  Get paid for creating.
                  <br />
                  Not for chasing brands.
                </p>

                <div className="mb-4 rounded-[14px] border border-[#EDE8EA] bg-white px-4 py-4">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <span className="text-[11px] font-bold tracking-[0.12em] text-[#8B8489] uppercase">
                      New order
                    </span>
                    <span className="rounded-full bg-deep-pink/10 px-2.5 py-1 text-[11px] font-bold text-deep-pink">
                      Payment held
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between gap-3">
                    <div>
                      <div className="text-[14px] font-bold text-[#181313]">
                        1 reel + 2 stories · Beauty
                      </div>
                      <div className="mt-1 text-[12.5px] text-[#8B8489]">
                        Delhi · due in 4 days
                      </div>
                    </div>
                    <span className="shrink-0 text-[15px] font-bold text-[#181313]">
                      ₹3,200
                    </span>
                  </div>
                </div>

                <div className="flex flex-col gap-2.5">
                  {BENEFITS.map((b) => (
                    <div key={b.title} className="flex items-start gap-2.5">
                      <span className="mt-0.5 grid size-4 shrink-0 place-items-center rounded-full bg-deep-pink/10">
                        <Check
                          className="size-2.5 text-deep-pink"
                          strokeWidth={3}
                          aria-hidden
                        />
                      </span>
                      <div>
                        <div className="text-[14px] font-bold text-[#181313]">
                          {b.title}
                        </div>
                        <div className="text-[13px] leading-snug text-[#8B8489]">
                          {b.note}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className={`${railCard} mt-5 border-t border-[#E8E4E6] pt-5`}>
                <div className="mb-3.5 text-[11px] font-bold tracking-[0.14em] text-[#8B8489] uppercase">
                  From profile to payout
                </div>
                <div className="flex flex-col gap-3.5">
                  {EARN_STEPS.map((n) => (
                    <div key={n.n} className="flex items-start gap-3">
                      <span className="shrink-0 text-[14px] font-bold text-deep-pink">
                        {n.n}
                      </span>
                      <div>
                        <div className="text-[14px] font-bold text-[#181313]">
                          {n.title}
                        </div>
                        <div className="mt-0.5 text-[13px] leading-snug text-[#8B8489]">
                          {n.note}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <p className="mt-4 text-[13px] text-[#8B8489]">
                  Free to join. You earn when a brand places an order.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
