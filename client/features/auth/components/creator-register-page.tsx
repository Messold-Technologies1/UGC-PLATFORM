"use client";

import { Sparkles, Wallet, Target, CheckCircle2 } from "lucide-react";
import { AuthLogoLink } from "./auth-logo-link";
import { CreatorRegisterForm } from "./creator-register-form";

export function CreatorRegisterPage() {
  return (
    <div className="grid min-h-dvh lg:h-dvh lg:overflow-hidden lg:grid-cols-[47.5%_52.5%] box-border">
      <div
        className="relative hidden flex-col overflow-hidden h-screen py-7 px-10 text-slate-900 lg:flex"
        style={{
          background:
            "linear-gradient(165deg, #fef5ee 0%, #fde9e8 55%, #fbd9d7 100%)",
        }}
      >
        <div
          className="absolute inset-0 z-0 pointer-events-none opacity-10"
          style={{
            backgroundImage:
              "radial-gradient(circle, #D2B4B4 1.5px, transparent 1.5px)",
            backgroundSize: "24px 24px",
          }}
        />
        <div
          className="absolute pointer-events-none z-0 rounded-full blur-[100px]"
          style={{
            width: "360px",
            height: "360px",
            top: "-120px",
            right: "-120px",
            background: "rgba(239, 62, 81, 0.25)",
          }}
        />
        <div className="relative z-10">
          <div className="-mt-10 mb-6">
            <AuthLogoLink imageClassName="h-32" />
          </div>

          {/* <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-sm font-semibold shadow-sm mb-6">
            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white">
              <Sparkles className="size-3" />
            </div>
            For creators
          </div> */}

          <h1 className="text-4xl font-extrabold tracking-tight lg:text-[40px] mb-4 leading-tight">
            Get booked by brands. <br />
            <span className="relative inline-block">
              <span className="relative z-10">Stop chasing DMs.</span>
              <div className="absolute bottom-2 left-0 h-4 w-full bg-[#CCFF00] -z-10 rounded-sm"></div>
            </span>
          </h1>

          <p className="text-base text-slate-700/80 max-w-lg mb-6">
            Join 10,000+ creators making paid UGC for India&apos;s most exciting
            D2C brands. Set your rates, pick the briefs you love.
          </p>

          <div className="space-y-3 w-full">
            <div
              className="grid items-center gap-3 rounded-[14px] py-[11px] px-[14px] border border-white/70 backdrop-blur-[4px]"
              style={{
                gridTemplateColumns: "36px 1fr",
                background: "rgba(255, 255, 255, 0.72)",
              }}
            >
              <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-red-500 text-white">
                <Sparkles className="size-4" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">
                  Get discovered by D2C brands
                </h3>
                <p className="text-xs text-slate-600">
                  Brands browse and request you directly — no DM chasing.
                </p>
              </div>
            </div>

            <div
              className="grid items-center gap-3 rounded-[14px] py-[11px] px-[14px] border border-white/70 backdrop-blur-[4px]"
              style={{
                gridTemplateColumns: "36px 1fr",
                background: "rgba(255, 255, 255, 0.72)",
              }}
            >
              <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-white">
                <Wallet className="size-4" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">
                  Get paid securely, on time
                </h3>
                <p className="text-xs text-slate-600">
                  Escrow-held payments released the moment your video is
                  approved.
                </p>
              </div>
            </div>

            <div
              className="grid items-center gap-3 rounded-[14px] py-[11px] px-[14px] border border-white/70 backdrop-blur-[4px]"
              style={{
                gridTemplateColumns: "36px 1fr",
                background: "rgba(255, 255, 255, 0.72)",
              }}
            >
              <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-indigo-500 text-white">
                <Target className="size-4" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">
                  Niche-fit briefs only
                </h3>
                <p className="text-xs text-slate-600">
                  Smart matching by niche, language and style. No spammy
                  requests.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="relative z-10 mt-auto w-full rounded-3xl bg-[#221C1D] p-5 text-white shadow-xl overflow-hidden">
          <div className="absolute top-5 right-6 opacity-40">
            <svg
              width="44"
              height="44"
              viewBox="0 0 24 24"
              fill="#CCFF00"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M10 11L8.5 16H5L6.5 11H4V5H10V11ZM20 11L18.5 16H15L16.5 11H14V5H20V11Z" />
            </svg>
          </div>
          <div className="flex gap-4 items-center">
            <div className="relative size-16 shrink-0 rounded-xl overflow-hidden border-2 border-white/10">
              <img
                src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80"
                alt="Aanya Kapoor"
                className="size-full object-cover"
              />
              <div className="absolute -bottom-1 -right-1 rounded-full bg-[#CCFF00] text-slate-950 p-0.5 border-2 border-slate-950">
                <CheckCircle2 className="size-3" />
              </div>
            </div>
            <div>
              <div className="flex gap-1 mb-2">
                {[1, 2, 3, 4, 5].map((i) => (
                  <svg
                    key={i}
                    className="size-4 text-[#CCFF00]"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
              <p className="text-sm font-medium leading-relaxed max-w-[420px] pr-12">
                "Booked 4 brands in my first month. The escrow makes saying yes
                so much easier."
              </p>
              <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs">
                <span className="font-bold text-white">Aanya Kapoor</span>
                <span className="text-white/50">
                  · Skincare creator, Mumbai
                </span>
                <span className="rounded bg-[#CCFF00]/20 px-1.5 py-0.5 font-semibold text-[#CCFF00]">
                  ₹42k/mo
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col bg-[#fdfcfb] dark:bg-slate-950 lg:h-dvh lg:min-h-0 lg:overflow-hidden">
        <div className="shrink-0 border-b border-pink-100/80 px-4 pb-4 pt-4 dark:border-slate-800 lg:hidden">
          <AuthLogoLink imageClassName="h-14 sm:h-16" />
          <p className="mt-3 text-base font-bold leading-snug text-slate-900">
            Get booked by brands.{" "}
            <span className="text-[#ef3e51]">Stop chasing DMs.</span>
          </p>
          <p className="mt-1.5 text-sm text-slate-600">
            Set your rates, showcase your work, and get discovered by D2C brands.
          </p>
        </div>
        <div className="flex min-h-0 flex-1 flex-col lg:overflow-hidden">
          <CreatorRegisterForm />
        </div>
      </div>
    </div>
  );
}
