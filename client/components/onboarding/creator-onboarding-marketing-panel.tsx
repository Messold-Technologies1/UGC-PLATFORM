"use client";

import { Sparkles } from "lucide-react";

const VALUE_PROPS = [
  {
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        className="size-[18px]"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path
          d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
    title: "Genuine Brand Collaborations",
    desc: "Work with brands that align with your niche and audience.",
  },
  {
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        className="size-[18px]"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path
          d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
    title: "Earn What You Deserve",
    desc: "Get fair pay for your content and timely payouts.",
  },
  {
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        className="size-[18px]"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path
          d="M2.25 18 9 11.25l4.306 4.306a11.95 11.95 0 0 1 5.814-5.518l2.74-1.22m0 0-5.94-2.281m5.94 2.28-2.28 5.941"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
    title: "Grow Your Creator Career",
    desc: "Build your portfolio, get discovered and grow your personal brand.",
  },
  {
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        className="size-[18px]"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path
          d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
    title: "Safe & Secure Platform",
    desc: "100% secure payments and dedicated support whenever you need.",
  },
] as const;

export function CreatorOnboardingMarketingPanel() {
  return (
    <aside className="flex h-full flex-col justify-between px-6 py-5 lg:px-8 lg:py-6">
      {/* ── Heading ── */}
      <div>
        <h1 className="text-lg font-bold leading-snug text-gray-900 lg:text-xl">
          Join LetsCollab as a
        </h1>
        <p className="flex items-center gap-1.5 text-2xl font-bold leading-tight text-purple-600 lg:text-[28px]">
          Creator{" "}
          <Sparkles className="size-4 text-purple-400" />
        </p>
        <p className="mt-2 max-w-[260px] text-xs leading-relaxed text-gray-500">
          Collaborate with amazing brands, create impactful content and grow
          your influence.
        </p>
      </div>

      {/* ── Creator hero image ── */}
      <div className="relative mt-3 overflow-hidden rounded-xl bg-linear-to-br from-purple-100 via-purple-50 to-orange-50">
        <div className="flex aspect-5/2 items-center justify-center">
          <div className="text-center">
            <div className="mx-auto flex size-11 items-center justify-center rounded-full bg-purple-100/80">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                className="size-5 text-purple-500"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <p className="mt-1 text-[10px] font-semibold text-purple-600">
              Create
            </p>
          </div>
        </div>

        {/* Total Earnings badge */}
        <div className="absolute bottom-2 right-2 flex items-center gap-1.5 rounded-lg bg-white/90 px-2.5 py-1.5 shadow-md backdrop-blur-sm">
          <div className="text-right">
            <p className="text-[9px] text-gray-500">Total Earnings</p>
            <p className="text-xs font-bold text-gray-900">₹1,72,450</p>
          </div>
          <div className="flex size-6 items-center justify-center rounded-md bg-purple-100">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              className="size-4 text-purple-600"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                d="M2.25 18 9 11.25l4.306 4.306a11.95 11.95 0 0 1 5.814-5.518l2.74-1.22"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>
      </div>

      {/* ── Why creators love LetsCollab ── */}
      <div className="mt-3">
        <h3 className="text-[13px] font-semibold text-gray-900">
          Why creators love LetsCollab
        </h3>
        <div className="mt-2 space-y-1.5">
          {VALUE_PROPS.map((prop) => (
            <div
              key={prop.title}
              className="flex items-start gap-2.5 rounded-lg border border-gray-100/80 bg-white px-3 py-2.5 transition-shadow hover:shadow-sm"
            >
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-purple-100 text-purple-600">
                {prop.icon}
              </span>
              <div className="min-w-0">
                <p className="text-xs font-bold text-gray-900">
                  {prop.title}
                </p>
                <p className="mt-px text-[11px] leading-snug text-gray-500">
                  {prop.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Testimonial ── */}
      <div className="mt-3">
        <div className="rounded-xl bg-purple-50/70 px-4 py-3">
          <span className="block text-xl font-serif leading-none text-purple-300 select-none">
            &ldquo;&ldquo;
          </span>
          <p className="mt-0.5 text-xs leading-relaxed text-gray-600">
            &ldquo;LetsCollab helped me collaborate with top{" "}
            <span className="font-serif text-sm text-purple-300 select-none">
              &rdquo;&rdquo;
            </span>
            <br />
            brands and grow my income consistently.&rdquo;
          </p>

          <div className="mt-2.5 flex items-center gap-2">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-purple-200 text-[10px] font-bold text-purple-700">
              AS
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-gray-900">
                Ananya Sharma
              </p>
              <p className="text-[10px] text-gray-500">Lifestyle Creator</p>
            </div>
            <div className="ml-auto flex gap-0.5 text-amber-400">
              {"★★★★★".split("").map((s, i) => (
                <span key={i} className="text-xs">
                  {s}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
