import React from "react";
import Image from "next/image";
import { Check } from "lucide-react";

export default function AboutPage() {
  return (
    <div className="bg-background relative overflow-x-hidden">
      <section className="bg-grain relative overflow-hidden py-[90px] pb-[100px]">
        <div className="absolute top-[-100px] right-[-80px] h-[340px] w-[340px] animate-float rounded-full bg-pink/20 blur-[60px]"></div>
        <div className="absolute bottom-[-80px] left-[-60px] h-[280px] w-[280px] animate-float-delayed rounded-full bg-sky/20 blur-[60px]"></div>

        <div className="mx-auto grid max-w-[1080px] items-center gap-14 px-6 md:grid-cols-[1.1fr_0.9fr] relative">
          <div>
            <div className="text-muted-foreground mb-5 text-sm font-semibold tracking-wider uppercase">
              ✦ About GoCollab
            </div>
            <h1 className="font-heading mb-6 text-4xl md:text-[3.25rem] md:leading-[1.1] font-bold tracking-tight">
              Every brand has a story.{" "}
              <span className="relative inline-block whitespace-nowrap">
                Every creator
                <span className="absolute inset-x-0 bottom-[0.2em] -z-10 h-[0.3em] -rotate-1 rounded-sm bg-lime/85"></span>
              </span>{" "}
              can tell it.
            </h1>
            <p className="max-w-[520px] text-lg text-foreground/80">
              At GoCollab, we believe exceptional content shouldn't be limited
              by follower counts. We're building a creator marketplace where
              brands discover, evaluate, and collaborate with creators based on
              creativity and craft — not audience size.
            </p>
          </div>
          <div>
            <div className="relative">
              <div className="relative aspect-[4/5] overflow-hidden rounded-[1.5rem] border-2 border-foreground shadow-hard bg-muted">
                <Image
                  src="/assets/hero_creator_work.png"
                  alt="Creator at work"
                  fill
                  className="object-cover"
                  priority
                />
              </div>
              <div className="absolute top-5 -left-6 flex animate-float-delayed items-center gap-1.5 rounded-full border-2 border-foreground bg-white px-3.5 py-2 text-xs font-bold text-black shadow-sticker">
                <span className="h-2 w-2 rounded-full bg-green-500"></span>{" "}
                Content, not follower count
              </div>
              <div className="absolute -right-4 -bottom-4 animate-float rounded-full border-2 border-foreground bg-lime px-4 py-2 text-xs font-extrabold text-lime-foreground shadow-sticker delay-400">
                ✦ Brand-fit first
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-secondary/60 py-[90px]">
        <div className="mx-auto grid max-w-[1080px] items-center gap-14 px-6 md:grid-cols-[0.85fr_1.15fr]">
          <div className="order-2 md:order-1">
            <div className="relative mx-auto aspect-[3/4] w-full max-w-[340px] overflow-hidden rounded-[1.25rem] border-2 border-foreground shadow-hard bg-muted">
              <Image
                src="/assets/chaos_dms_spreadsheets.png"
                alt="Endless DMs and spreadsheets"
                fill
                className="object-cover"
              />
            </div>
          </div>
          <div className="order-1 md:order-2">
            <div className="text-muted-foreground mb-3.5 text-sm font-semibold tracking-wider uppercase">
              ✦ The gap
            </div>
            <h2 className="font-heading mb-5.5 text-3xl font-bold">
              Why we built GoCollab
            </h2>
            <p className="text-lg text-foreground/80">
              The creator economy has grown rapidly, but the collaboration
              process hasn't kept pace. Brands spend countless hours searching
              for suitable creators, while talented creators struggle to get
              noticed despite outstanding content. Too many decisions are made
              on follower counts instead of content quality and brand fit.
            </p>
            <p className="mt-4.5 text-lg text-foreground/80">
              GoCollab bridges this gap — a streamlined marketplace where both
              sides discover, connect, and collaborate with confidence.
            </p>
          </div>
        </div>
      </section>
      <section className="py-[90px]">
        <div className="mx-auto max-w-[700px] px-6">
          <div className="text-muted-foreground mb-3.5 text-sm font-semibold tracking-wider uppercase">
            ✦ The idea
          </div>
          <h2 className="font-heading mb-6.5 text-3xl font-bold">
            A platform built around fit, not followers
          </h2>
          <div className="rounded-xl border-2 border-foreground bg-lime p-[28px_30px] shadow-hard">
            <p className="text-lg font-semibold text-lime-foreground">
              Our goal is simple: create a platform where brands find the right
              creators, and creators find opportunities that value their work.
            </p>
          </div>
          <p className="mt-6 text-lg text-foreground/80">
            Whether you're an emerging UGC creator or an established content
            professional, GoCollab is designed to make meaningful collaborations
            easier, faster, and more transparent.
          </p>
        </div>
      </section>
      <section className="bg-secondary/60 py-[90px]">
        <div className="mx-auto grid max-w-[1080px] items-center gap-14 px-6 md:grid-cols-[1fr_0.8fr]">
          <div>
            <div className="text-muted-foreground mb-3.5 text-sm font-semibold tracking-wider uppercase">
              ✦ The platform
            </div>
            <h2 className="font-heading mb-3.5 text-3xl font-bold">
              What we offer
            </h2>
            <p className="mb-7 text-lg text-foreground/80">
              GoCollab is built to simplify every stage of creator
              collaborations.
            </p>
            <ul className="grid gap-3.5">
              {[
                {
                  color: "bg-sky",
                  text: "Creator discovery based on niche, style, location, and content",
                },
                {
                  color: "bg-lime",
                  text: "Detailed creator portfolios that showcase real work",
                },
                {
                  color: "bg-pink text-white",
                  text: "Easy collaboration between brands and creators",
                },
                {
                  color: "bg-grape text-white",
                  text: "Transparent communication throughout campaigns",
                },
                {
                  color: "bg-sky",
                  text: "A growing network of creators across multiple industries",
                },
                {
                  color: "bg-lime",
                  text: "Built for both UGC campaigns and influencer marketing",
                },
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span
                    className={`mt-0.5 flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full border-2 border-foreground ${item.color}`}
                  >
                    <Check className="h-3 w-3 stroke-[3]" />
                  </span>
                  <span className="text-lg text-foreground">{item.text}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <div className="relative aspect-[3/4] overflow-hidden rounded-[1.25rem] border-2 border-foreground shadow-hard bg-muted">
              <Image
                src="/assets/portfolio_reel_preview.png"
                alt="Creator portfolio preview"
                fill
                className="object-cover"
              />
            </div>
          </div>
        </div>
      </section>
      <section className="bg-grain bg-foreground py-[100px]">
        <div className="mx-auto max-w-[700px] px-6">
          <div className="mb-4.5 text-sm font-semibold tracking-wider text-background/60 uppercase">
            ✦ Our roots
          </div>
          <h2 className="font-heading mb-6.5 text-[2.75rem] leading-tight font-bold text-background">
            Powered by Messold
          </h2>
          <p className="text-lg text-background/85">
            GoCollab is proudly developed by Messold, a digital growth company
            that partners with brands to build high-performing digital
            experiences, marketing strategies, and scalable growth systems.
          </p>
          <p className="mt-4.5 text-lg text-background/85">
            Working closely with brands across industries gave us first-hand
            insight into the challenges of sourcing quality creators — GoCollab
            was built as the natural solution.
          </p>
          <p className="mt-4.5 text-lg text-background/85">
            Today, the platform continues to evolve with the same focus that
            drives everything at Messold — creating products that solve real
            business problems through thoughtful technology and user experience.
          </p>
        </div>
      </section>
      <section className="py-[120px]">
        <div className="mx-auto max-w-[1080px] px-6 text-center">
          <div className="text-muted-foreground mb-5.5 text-sm font-semibold tracking-wider uppercase">
            ✦ Our vision
          </div>
          <h2 className="font-heading mx-auto mb-5.5 max-w-[780px] text-balance text-4xl md:text-5xl font-bold leading-tight">
            Every brand finds creators that fit. Every creator finds work that
            values them.
          </h2>
          <p className="mx-auto max-w-[620px] text-lg text-foreground/80">
            We envision a creator economy where authentic content, professional
            collaboration, and long-term relationships create value for
            everyone.
          </p>
        </div>
      </section>
      <section className="bg-secondary/60 py-[90px]">
        <div className="mx-auto max-w-[700px] px-6 text-center">
          <div className="text-muted-foreground mb-3.5 text-sm font-semibold tracking-wider uppercase">
            ✦ Looking ahead
          </div>
          <h2 className="font-heading mb-5.5 text-3xl font-bold">
            Join the future of creator collaborations
          </h2>
          <p className="text-lg text-foreground/80">
            Whether you're a brand looking for fresh creative talent or a
            creator ready to collaborate with exciting businesses, GoCollab is
            built to help you connect, create, and grow together.
          </p>
        </div>
      </section>
    </div>
  );
}
