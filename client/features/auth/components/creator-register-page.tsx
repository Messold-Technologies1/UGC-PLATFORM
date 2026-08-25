"use client";

import Image from "next/image";
import Link from "next/link";
import { AuthLogoLink } from "./auth-logo-link";
import { CreatorRegisterForm } from "./creator-register-form";

/**
 * Creator signup shell (/register/creator).
 *
 * Owns the page chrome from the Creator Registration design — sticky header,
 * the headline above the form card, and the sticky right-hand rail. The form
 * card itself, and every field in it, stays in CreatorRegisterForm.
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
    n: "1",
    title: "Add your work",
    note: "Four to six pieces is enough to start getting found.",
  },
  {
    n: "2",
    title: "Set your rates and services",
    note: "Your price, your delivery time, your add-ons — all editable later.",
  },
  {
    n: "3",
    title: "Publish and share your link",
    note: "One URL for your Instagram bio and every brand enquiry.",
  },
];

/** Cards that drop out on the narrowest screens, per the design. */
const railCard = "hidden border-foreground rounded-[24px] border-2 sm:block";

export function CreatorRegisterPage() {
  return (
    <div className="bg-grain bg-background text-foreground min-h-screen">
      <header className="border-foreground bg-background/92 sticky top-0 z-40 border-b-2 backdrop-blur-[12px]">
        <div className="mx-auto flex max-w-[1180px] flex-wrap items-center justify-between gap-4 px-5 py-3.5">
          <div className="flex items-center gap-[11px]">
            {/* The design's wordmark is 21px; brand-logo.png carries more
                padding, so it needs a touch more height to read the same. */}
            <AuthLogoLink imageClassName="h-7" />
            <span className="font-heading border-foreground bg-pink text-foreground rounded-full border-2 px-[11px] py-1 text-[11px] font-bold tracking-[0.12em] uppercase">
              Creator sign up
            </span>
          </div>
          <span className="text-muted-foreground text-[13.5px]">
            Already a creator?{" "}
            <Link
              href="/login?role=creator"
              className="font-heading text-foreground font-bold hover:underline"
            >
              Log in as Creator
            </Link>
          </span>
        </div>
      </header>

      <div className="mx-auto max-w-[1180px] px-5 pt-[clamp(28px,4vw,56px)] pb-[clamp(48px,7vw,88px)]">
        <div className="grid items-start gap-[clamp(28px,4vw,56px)] lg:grid-cols-[1.05fr_0.95fr]">
          {/* FORM */}
          <div>
            <h1 className="font-heading mb-3 text-[clamp(1.9rem,3.6vw,2.8rem)] leading-[1.04] font-bold tracking-[-0.03em] text-balance">
              Create your creator profile
            </h1>
            <p className="text-muted-foreground mb-[clamp(28px,3.5vw,40px)] max-w-[520px] text-base leading-relaxed text-pretty">
              Four details and you&rsquo;re in. Your work, pricing and services
              come next — and you set all of them.
            </p>

            <CreatorRegisterForm />

            <div className="mt-[22px] flex flex-wrap items-center justify-between gap-4">
              <span className="text-muted-foreground text-sm">
                Already a creator?{" "}
                <Link
                  href="/login?role=creator"
                  className="font-heading text-foreground font-bold hover:underline"
                >
                  Log in as Creator
                </Link>
              </span>
              <span className="text-muted-foreground text-[13px]">
                Hiring creators?{" "}
                <Link
                  href="/register/brand"
                  className="text-foreground underline underline-offset-2"
                >
                  Sign up as a brand
                </Link>
              </span>
            </div>
          </div>

          {/* RAIL */}
          <div>
            <div className="lg:sticky lg:top-24">
              <div className="border-foreground shadow-hard mb-[18px] rounded-[28px] border-2 bg-[#FFEDF4] p-[clamp(24px,3vw,32px)]">
                <p className="font-heading mb-6 text-[clamp(1.35rem,2.5vw,1.85rem)] leading-[1.14] font-extrabold tracking-[-0.03em] text-balance">
                  The last time you&rsquo;ll type your rates into a DM.
                </p>

                <div className="mb-[22px] flex flex-col gap-2.5">
                  <div className="border-foreground max-w-[88%] self-start rounded-[16px_16px_16px_5px] border-2 bg-white px-[15px] py-3 text-sm leading-[1.5]">
                    Hi! Can you share your portfolio, rates and delivery time?
                  </div>
                  <div className="border-foreground bg-pink max-w-[88%] self-end rounded-[16px_16px_5px_16px] border-2 px-[15px] py-3 text-sm leading-[1.5] shadow-sticker">
                    Everything&rsquo;s here →{" "}
                    <span className="font-heading font-bold underline underline-offset-2">
                      gocollab.in/yourname
                    </span>
                  </div>
                </div>

                <div className="border-foreground rounded-[18px] border-2 bg-[#FFF7FA] px-[18px] py-[17px]">
                  <div className="font-heading text-muted-foreground mb-3.5 text-[11px] font-bold tracking-[0.12em] uppercase">
                    That one link carries
                  </div>
                  <div className="flex flex-wrap gap-[9px]">
                    {LINK_CARRIES.map((c) => (
                      <span
                        key={c}
                        className="font-heading border-foreground rounded-full border-2 bg-white px-[13px] py-[7px] text-[12.5px] font-bold"
                      >
                        {c}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className={`${railCard} bg-white p-[clamp(20px,2.6vw,26px)]`}>
                <div className="mb-4 flex items-center gap-[11px]">
                  <Image
                    src="/3.jpg"
                    alt=""
                    width={38}
                    height={38}
                    className="border-foreground h-[38px] w-[38px] rounded-full border-2 object-cover"
                  />
                  <div>
                    <div className="font-heading text-[13.5px] font-bold">
                      Meher Kaur
                    </div>
                    <div className="text-muted-foreground text-xs">
                      Fashion creator, Delhi · joined 8 months ago
                    </div>
                  </div>
                </div>
                <div className="text-muted-foreground text-[14.5px] leading-relaxed text-pretty">
                  &ldquo;I stopped sending Drive folders and screenshots of my
                  rate card. Now brands read all of it before they message me —
                  so the conversation starts at the brief, not at &lsquo;what do
                  you charge&rsquo;.&rdquo;
                </div>
              </div>

              <div
                className={`${railCard} mt-[18px] bg-[#FFF7FA] p-[clamp(20px,2.6vw,26px)]`}
              >
                <div className="font-heading text-muted-foreground mb-[18px] text-[11px] font-bold tracking-[0.12em] uppercase">
                  Right after you sign up
                </div>
                <div className="flex flex-col">
                  {NEXT_STEPS.map((n) => (
                    <div
                      key={n.n}
                      className="border-foreground/10 flex items-start gap-[13px] border-t-2 py-3.5"
                    >
                      <span className="font-heading border-foreground grid h-6 w-6 shrink-0 place-items-center rounded-full border-2 bg-white text-[11.5px] font-extrabold">
                        {n.n}
                      </span>
                      <div>
                        <div className="font-heading mb-[3px] text-[14.5px] font-bold">
                          {n.title}
                        </div>
                        <div className="text-muted-foreground text-[13px] leading-[1.5]">
                          {n.note}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="border-foreground/10 text-muted-foreground mt-[18px] flex items-center gap-2.5 border-t-2 pt-[18px] text-[13px]">
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.4"
                    className="text-foreground shrink-0"
                    aria-hidden
                  >
                    <circle cx="12" cy="12" r="9" />
                    <path d="M12 7.5v5l3 2" strokeLinecap="round" />
                  </svg>
                  Most creators finish in under 15 minutes.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
