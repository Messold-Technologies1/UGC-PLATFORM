"use client";

import Link from "next/link";
import { Sparkles } from "lucide-react";

const VALUE_PROPS = [
  {
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        className="size-5"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path
          d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z"
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
        className="size-5"
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
        className="size-5"
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
        className="size-5"
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
    <aside className="relative flex h-full flex-col justify-between bg-white px-5 py-4 lg:px-7">
      {/* Heading */}
      <div>
        <div className="mt-4">
          <p className="text-lg font-bold text-gray-900 lg:text-xl">
            Join LetsCollab as a
          </p>
          <p className="flex items-center gap-1.5 text-lg font-bold text-purple-600 lg:text-xl">
            Creator <Sparkles className="size-4 text-purple-400" />
          </p>
          <p className="mt-2 text-xs leading-relaxed text-gray-500">
            Collaborate with amazing brands, create impactful content and grow
            your influence.
          </p>
        </div>

        <div className="relative mt-3 overflow-hidden rounded-xl bg-gradient-to-br from-purple-100 via-purple-50 to-orange-50">
          <div className="flex aspect-[5/2] items-center justify-center">
            <div className="text-center">
              <div className="mx-auto flex size-11 items-center justify-center rounded-full bg-purple-100">
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
              <p className="mt-1 text-[10px] font-medium text-purple-600">
                Create
              </p>
            </div>
          </div>

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

        <div className="mt-3">
          <p className="text-[11px] font-semibold text-gray-900">
            Why creators love LetsCollab
          </p>
          <div className="mt-1.5 space-y-1">
            {VALUE_PROPS.map((prop) => (
              <div key={prop.title} className="flex items-center gap-2">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-purple-50 text-purple-600">
                  {prop.icon}
                </span>
                <p className="text-[11px] font-medium text-gray-700">
                  {prop.title}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Testimonial */}
      <div className="mt-3">
        <div className="rounded-lg bg-purple-50 p-3">
          <p className="text-sm italic leading-snug text-gray-600">
            &ldquo;LetsCollab helped me collaborate with top brands and grow my
            income.&rdquo;
          </p>
          <div className="mt-2 flex items-center gap-2">
            <div className="flex size-7 items-center justify-center rounded-full bg-purple-200 text-[10px] font-bold text-purple-700">
              AS
            </div>
            <div>
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
