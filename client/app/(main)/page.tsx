import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { FeaturedCreators } from "@/features/creators";
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

export default function Home() {
  return (
    <div className="flex flex-col">
      <section className="relative overflow-hidden">
        <div className="absolute -left-40 top-20 size-80 rounded-full bg-muted blur-3xl" />
        <div className="absolute -right-40 bottom-20 size-80 rounded-full bg-muted blur-3xl" />

        <div className="relative mx-auto max-w-[1440px] px-4 py-10 sm:px-6 sm:py-12 lg:px-8 lg:py-16">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-4 flex items-center justify-center gap-3 text-sm font-medium text-foreground">
              <span className="text-muted-foreground">Experts in</span>
              <span className="inline-flex items-center gap-1.5">
                <Image src="/meta-icon.svg" alt="Meta" width={20} height={13} />
                <span className="font-semibold">Meta</span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <svg viewBox="0 0 24 24" className="size-5" fill="currentColor" aria-hidden="true">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 1.17.054 1.97.24 2.43.403a4.088 4.088 0 0 1 1.47.957c.453.452.768.923.957 1.47.163.46.349 1.26.404 2.43.058 1.266.069 1.646.069 4.85s-.012 3.584-.07 4.85c-.054 1.17-.24 1.97-.403 2.43a4.088 4.088 0 0 1-.957 1.47 4.088 4.088 0 0 1-1.47.957c-.46.163-1.26.349-2.43.404-1.266.058-1.646.069-4.85.069s-3.584-.012-4.85-.07c-1.17-.054-1.97-.24-2.43-.403a4.088 4.088 0 0 1-1.47-.957 4.088 4.088 0 0 1-.957-1.47c-.163-.46-.349-1.26-.404-2.43C2.175 15.584 2.163 15.204 2.163 12s.012-3.584.07-4.85c.054-1.17.24-1.97.403-2.43a4.088 4.088 0 0 1 .957-1.47A4.088 4.088 0 0 1 5.063 2.293c.46-.163 1.26-.349 2.43-.404C8.759 1.831 9.139 1.82 12.343 1.82zM12 0C8.741 0 8.333.014 7.053.072 5.775.131 4.903.333 4.14.63a5.876 5.876 0 0 0-2.126 1.384A5.876 5.876 0 0 0 .63 4.14C.333 4.903.131 5.775.072 7.053.014 8.333 0 8.741 0 12s.014 3.668.072 4.948c.059 1.277.261 2.149.558 2.912a5.876 5.876 0 0 0 1.384 2.126 5.876 5.876 0 0 0 2.126 1.384c.763.297 1.635.499 2.913.558C8.333 23.986 8.741 24 12 24s3.668-.014 4.948-.072c1.277-.059 2.149-.261 2.912-.558a5.876 5.876 0 0 0 2.126-1.384 5.876 5.876 0 0 0 1.384-2.126c.297-.763.499-1.635.558-2.913C23.986 15.668 24 15.259 24 12s-.014-3.668-.072-4.948c-.059-1.277-.261-2.149-.558-2.912a5.876 5.876 0 0 0-1.384-2.126A5.876 5.876 0 0 0 19.86.63C19.097.333 18.225.131 16.948.072 15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z" />
                </svg>
                <span className="font-semibold">Instagram</span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <svg
                  viewBox="0 0 24 24"
                  className="size-5 text-red-600"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path d="M10 14.65v-5.3L15 12l-5 2.65zm7.77-4.33-1.2-.5L18 9.06c1.84-.96 2.53-3.23 1.56-5.06s-3.24-2.53-5.07-1.56L6 6.94c-1.29.68-2.07 2.04-2 3.49.07 1.42.93 2.67 2.22 3.25.03.01 1.2.5 1.2.5L6 14.93c-1.83.97-2.53 3.24-1.56 5.07.97 1.83 3.24 2.53 5.07 1.56l8.5-4.5c1.29-.68 2.06-2.04 1.99-3.49-.07-1.42-.94-2.68-2.23-3.25z" />
                </svg>
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
            <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link href="/signup">
                <Button
                  size="lg"
                  className="w-full gap-2 bg-foreground border-0 text-background hover:opacity-90 sm:w-auto"
                >
                  Get Started Free
                  <ArrowRight className="size-4" />
                </Button>
              </Link>
              <Link href="/login">
                <Button
                  variant="outline"
                  size="lg"
                  className="w-full sm:w-auto"
                >
                  Log in
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-border/60 bg-muted/30">
        <div className="mx-auto grid max-w-[1440px] grid-cols-2 gap-8 px-4 py-8 sm:px-6 md:grid-cols-4 lg:px-8">
          {stats.map(({ value, label }) => (
            <div key={label} className="text-center">
              <p className="text-3xl font-bold tracking-tight">{value}</p>
              <p className="mt-1 text-sm text-muted-foreground">{label}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-[1440px] px-4 pt-16 pb-24 sm:px-6 lg:px-8">
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

      <section className="mx-auto max-w-[1440px] px-4 pb-24 sm:px-6 lg:px-8">
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
              <Link href="/creator/dashboard" className="mt-8 block">
                <Button
                  size="lg"
                  className="w-full gap-2 bg-foreground border-0 text-background hover:opacity-90"
                >
                  Join as Creator
                  <ArrowRight className="size-4" />
                </Button>
              </Link>
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
              <Link href="/brand/dashboard" className="mt-8 block">
                <Button variant="outline" size="lg" className="w-full gap-2">
                  Join as Brand
                  <ArrowRight className="size-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-foreground" />
        <div className="relative mx-auto max-w-[1440px] px-4 py-20 text-center sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold tracking-tight text-background sm:text-4xl">
            Ready to create amazing content?
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-background/70">
            Join thousands of creators and brands already using UGC Platform to
            create authentic, high-performing content.
          </p>
          <Link href="/signup" className="mt-8 inline-block">
            <Button
              size="lg"
              className="gap-2 bg-background text-foreground hover:bg-background/90 border-0"
            >
              Start for Free
              <ArrowRight className="size-4" />
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
