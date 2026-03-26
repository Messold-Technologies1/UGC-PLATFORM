import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { FeaturedCreators } from "@/features/creators";
import {
  InstagramIcon,
  YouTubeShortsIcon,
} from "@/components/icons/social-icons";
import {
  ArrowRight,
  Video,
  Building2,
  Zap,
  Shield,
  TrendingUp,
  Users,
  Star,
  CheckCircle2,
} from "lucide-react";

const features = [
  {
    icon: Zap,
    title: "Fast Matching",
    description:
      "Our algorithm connects brands with the perfect creators in minutes, not days.",
  },
  {
    icon: Shield,
    title: "Secure Payments",
    description:
      "Escrow-protected payments ensure creators get paid and brands get quality content.",
  },
  {
    icon: TrendingUp,
    title: "Performance Tracking",
    description:
      "Real-time analytics on content performance, engagement, and ROI.",
  },
  {
    icon: Users,
    title: "Vetted Creators",
    description:
      "Every creator is verified and reviewed to ensure professional-quality content.",
  },
];

const stats = [
  { value: "10K+", label: "Creators" },
  { value: "2K+", label: "Brands" },
  { value: "50K+", label: "Videos Made" },
  { value: "98%", label: "Satisfaction" },
];

const creatorBenefits = [
  "Get paid for creating content you love",
  "Work with top brands across industries",
  "Flexible schedule — work from anywhere",
  "Build your portfolio and grow your audience",
];

const brandBenefits = [
  "Authentic content that converts",
  "Access a diverse pool of verified creators",
  "Full usage rights on all delivered content",
  "Scale your content production effortlessly",
];

export function LandingPageContent() {
  return (
    <div className="flex flex-col">
      <section className="relative overflow-hidden">
        <div className="absolute -left-40 top-20 size-80 rounded-full bg-muted blur-3xl" />
        <div className="absolute -right-40 bottom-20 size-80 rounded-full bg-muted blur-3xl" />

        <div className="relative mx-auto max-w-site px-4 py-10 sm:px-6 sm:py-12 lg:px-8 lg:py-16">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-4 flex items-center justify-center gap-3 text-sm font-medium text-foreground">
              <span className="text-muted-foreground">Experts in</span>
              <span className="inline-flex items-center gap-1.5">
                <Image src="/meta-icon.svg" alt="Meta" width={20} height={13} />
                <span className="font-semibold">Meta</span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <InstagramIcon className="size-5" />
                <span className="font-semibold">Instagram</span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <YouTubeShortsIcon className="size-5 text-red-600" />
                <span className="font-semibold">Shorts</span>
              </span>
            </div>
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-muted px-4 py-1.5 text-xs font-medium text-foreground">
              <Star className="size-3" />
              The #1 UGC Creator Marketplace
            </div>
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
              Where{" "}
              <span className="underline decoration-2 underline-offset-4">
                Creators
              </span>{" "}
              Meet{" "}
              <span className="underline decoration-2 underline-offset-4">
                Brands
              </span>
            </h1>
            <p className="mx-auto mt-6 max-w-xl text-base text-muted-foreground sm:text-lg">
              The marketplace for authentic user-generated content. Connect,
              collaborate, and create content that drives real results.
            </p>
            <div className="mt-10 flex justify-center">
              <Button
                asChild
                size="lg"
                className="w-full gap-2 bg-foreground border-0 text-background hover:opacity-90 sm:w-auto"
              >
                <Link href="/signup">
                  Get Started Free
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-border/60 bg-muted/30">
        <div className="mx-auto grid max-w-site grid-cols-2 gap-8 px-4 py-8 sm:px-6 md:grid-cols-4 lg:px-8">
          {stats.map(({ value, label }) => (
            <div key={label} className="text-center">
              <p className="text-3xl font-bold tracking-tight">{value}</p>
              <p className="mt-1 text-sm text-muted-foreground">{label}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-site px-4 pt-16 pb-24 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Everything you need to{" "}
            <span className="underline decoration-2 underline-offset-4">
              scale UGC
            </span>
          </h2>
          <p className="mt-4 text-muted-foreground">
            From discovery to delivery, we handle every step of the UGC
            workflow.
          </p>
        </div>
        <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {features.map(({ icon: Icon, title, description }) => (
            <div
              key={title}
              className="group relative overflow-hidden rounded-2xl border border-border bg-card p-6 transition-shadow hover:shadow-xl hover:shadow-foreground/5"
            >
              <div className="absolute -right-6 -top-6 size-24 rounded-full bg-muted transition-transform group-hover:scale-125" />
              <div className="relative">
                <div className="mb-4 flex size-11 items-center justify-center rounded-xl bg-foreground/10">
                  <Icon className="size-5 text-foreground" />
                </div>
                <h3 className="text-sm font-medium">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <FeaturedCreators />

      <section className="mx-auto max-w-site px-4 pb-24 sm:px-6 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="relative overflow-hidden rounded-3xl border border-border bg-card p-8 sm:p-10">
            <div className="absolute -right-10 -top-10 size-40 rounded-full bg-muted" />
            <div className="relative">
              <div className="mb-4 flex size-12 items-center justify-center rounded-2xl bg-foreground">
                <Video className="size-5 text-background" />
              </div>
              <h3 className="text-2xl font-bold">I&apos;m a Creator</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Monetize your creativity and work with brands you love.
              </p>
              <ul className="mt-6 space-y-3">
                {creatorBenefits.map((benefit) => (
                  <li key={benefit} className="flex items-start gap-2 text-sm">
                    <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-foreground" />
                    {benefit}
                  </li>
                ))}
              </ul>
              <Button
                asChild
                size="lg"
                className="mt-8 w-full gap-2 bg-foreground border-0 text-background hover:opacity-90"
              >
                <Link href="/creator/dashboard">
                  Join as Creator
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-3xl border border-border bg-card p-8 sm:p-10">
            <div className="absolute -right-10 -top-10 size-40 rounded-full bg-muted" />
            <div className="relative">
              <div className="mb-4 flex size-12 items-center justify-center rounded-2xl bg-foreground">
                <Building2 className="size-5 text-background" />
              </div>
              <h3 className="text-2xl font-bold">I&apos;m a Brand</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Get authentic content that drives conversions at scale.
              </p>
              <ul className="mt-6 space-y-3">
                {brandBenefits.map((benefit) => (
                  <li key={benefit} className="flex items-start gap-2 text-sm">
                    <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-foreground" />
                    {benefit}
                  </li>
                ))}
              </ul>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="mt-8 w-full gap-2"
              >
                <Link href="/brand/dashboard">
                  Join as Brand
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-foreground" />
        <div className="relative mx-auto max-w-site px-4 py-20 text-center sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold tracking-tight text-background sm:text-4xl">
            Ready to create amazing content?
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-background/70">
            Join thousands of creators and brands already using Collabry to
            create authentic, high-performing content.
          </p>
          <Button
            asChild
            size="lg"
            className="mt-8 gap-2 bg-background text-foreground border-0 hover:opacity-90 [a]:hover:bg-background"
          >
            <Link href="/signup">
              Start for Free
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
