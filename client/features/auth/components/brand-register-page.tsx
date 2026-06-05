"use client";

import Image from "next/image";
import { Search, ClipboardList, ShieldCheck, MonitorPlay } from "lucide-react";
import { BrandRegisterForm } from "./brand-register-form";

export function BrandRegisterPage() {
  return (
    <div className="grid h-dvh overflow-hidden lg:grid-cols-[47.5%_52.5%] box-border">
      <div
        className="relative hidden flex-col overflow-hidden h-screen py-7 px-10 text-slate-900 lg:flex"
        style={{
          background:
            "linear-gradient(165deg, #eef5fe 0%, #e8eefd 55%, #d7e4fb 100%)",
        }}
      >
        <div
          className="absolute inset-0 z-0 pointer-events-none opacity-10"
          style={{
            backgroundImage:
              "radial-gradient(circle, #B4C6D2 1.5px, transparent 1.5px)",
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
            background: "rgba(62, 118, 239, 0.25)",
          }}
        />
        <div className="relative z-10 flex flex-col h-full">
          <div className="-mt-10 mb-6">
            <img
              src="/brand-logo.png"
              alt="UGCull"
              className="h-32 w-auto object-contain object-left"
            />
          </div>

          <h1 className="text-[42px] font-extrabold tracking-tight mb-5 leading-[1.1]">
            Manage creator collaborations <br />
            <span className="text-[#5138ed]">without the chaos.</span>
          </h1>

          <p className="text-[15px] text-slate-700/90 max-w-lg mb-8 font-medium leading-relaxed">
            Everything you need to find creators, manage projects, and get high
            performing content— all in one place.
          </p>

          <div className="space-y-3 w-full max-w-lg">
            <div
              className="grid items-center gap-3 rounded-[14px] py-[11px] px-[14px] border border-white/70 backdrop-blur-[4px]"
              style={{
                gridTemplateColumns: "36px 1fr",
                background: "rgba(255, 255, 255, 0.72)",
              }}
            >
              <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-blue-500 text-white">
                <Search className="size-4" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">
                  Discover creators faster
                </h3>
                <p className="text-xs text-slate-600">
                  Find the right creators in minutes, not hours.
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
                <ClipboardList className="size-4" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">
                  Streamline your workflow
                </h3>
                <p className="text-xs text-slate-600">
                  Brief, manage, approve and track deliverables from one clean dashboard.
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
              <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[#5138ed] text-white">
                <ShieldCheck className="size-4" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">
                  Secure payments, always
                </h3>
                <p className="text-xs text-slate-600">
                  Safe payments and protected transactions for every collaboration.
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
                <MonitorPlay className="size-4" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">
                  Build a reusable content engine
                </h3>
                <p className="text-xs text-slate-600">
                  Save creators, reuse briefs and scale winning content.
                </p>
              </div>
            </div>
          </div>

          {/* <div className="mt-auto pt-8">
            <p className="text-[13px] font-semibold text-slate-600 mb-4">
              Trusted by 500+ brands worldwide
            </p>
            <div className="flex flex-wrap items-center justify-between max-w-lg opacity-60 grayscale mix-blend-multiply">
              <span className="text-[22px] font-serif font-bold tracking-tight text-slate-800">
                mamaearth
              </span>
              <span className="text-[15px] font-bold tracking-[0.15em] uppercase text-slate-800">
                Sugar
              </span>
              <span className="text-[26px] font-black tracking-tighter lowercase text-slate-800">
                bo<span className="text-slate-600">A</span>t
              </span>
              <span className="text-[22px] font-medium tracking-wide lowercase text-slate-800 font-['Outfit']">
                plum
              </span>
              <span className="text-[19px] font-bold tracking-tight lowercase text-slate-800">
                minimalist
              </span>
            </div>
          </div> */}
        </div>
      </div>

      <div className="flex flex-col h-dvh bg-[#fdfcfb] dark:bg-slate-950 overflow-hidden">
        <BrandRegisterForm />
      </div>
    </div>
  );
}
