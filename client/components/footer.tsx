import { memo } from "react";
import Link from "next/link";
import { ArrowUp, Instagram, Linkedin, Mail, Phone } from "lucide-react";
import { SITE_NAME } from "@/config/site";

const shell = "mx-auto w-full max-w-site px-4 sm:px-6 lg:px-8";

const policyLinks = [
  { label: "Privacy Policy", href: "/legal/privacy" },
  { label: "Terms of Service", href: "/legal/terms" },
  { label: "Cookie Policy", href: "/legal/cookie" },
  { label: "Creator Guidelines", href: "/legal/guidelines" },
  { label: "Brand Guidelines", href: "/legal/brand-guidelines" },
  { label: "AI Content Policy", href: "/legal/ai-content-policy" },
  { label: "Usage Rights Policy", href: "/legal/usage-rights-policy" },
  { label: "Payout Policy", href: "/legal/payout-policy" },
  {
    label: "Refund & Cancellation Policy",
    href: "/legal/terms#refunds-cancellations-and-disputes",
  },
] as const;

function FooterHeading({ children }: { children: string }) {
  return (
    <h3 className="mb-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-foreground/40">
      {children}
    </h3>
  );
}

function FooterLink({ href, children }: { href: string; children: string }) {
  return (
    <Link
      href={href}
      prefetch
      className="text-sm text-foreground/80 transition-colors hover:text-deep-pink"
    >
      {children}
    </Link>
  );
}

export const Footer = memo(function Footer() {
  return (
    <footer className="relative overflow-hidden bg-[#fff8f9] text-foreground">
      <div
        aria-hidden
        className="pointer-events-none absolute -left-28 -top-40 h-[22rem] w-[22rem] rounded-full bg-blush-100/90 blur-2xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-24 -top-24 h-[26rem] w-[26rem] rounded-full bg-blush-150/70 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-24 left-1/3 h-48 w-[28rem] rounded-full bg-blush-100/60 blur-3xl"
      />

      <svg
        aria-hidden
        viewBox="0 0 1440 80"
        preserveAspectRatio="none"
        className="relative block h-12 w-full text-background sm:h-14 md:h-16"
      >
        <path
          fill="currentColor"
          d="M0 0H1440V18C1220 78 980 8 720 40C460 72 220 10 0 52V0Z"
        />
      </svg>

      <div className={`${shell} relative pb-8 pt-2 sm:pb-10 sm:pt-4`}>
        <div className="grid grid-cols-1 gap-10 pb-10 sm:grid-cols-2 lg:grid-cols-[1.15fr_0.95fr_0.95fr_0.9fr] lg:gap-x-10">
          <div className="max-w-88">
            <Link
              href="/"
              prefetch
              aria-label={`${SITE_NAME} home`}
              className="relative flex h-12 w-42 shrink-0 items-center overflow-hidden sm:w-47.5 md:w-53.5"
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- same static mark as the navbar; clip the padded PNG so the visual size matches without stretching the column */}
              <img
                src="/brand-logo.png"
                alt={SITE_NAME}
                width={688}
                height={160}
                className="absolute left-0 top-1/2 h-17.25 w-auto max-w-none -translate-y-1/2 object-contain object-left sm:h-21.25 md:h-26"
                loading="eager"
                decoding="async"
                draggable={false}
              />
            </Link>
            <p className="mt-5 text-sm leading-relaxed text-muted-foreground">
              GoCollab is a technology platform owned and operated by Messold
              Technologies, facilitating discovery, communication, and campaign
              management between brands and creators. Use is subject to the
              Terms of Service, Privacy Policy, and Cookie Policy. All content,
              software, and trademarks remain the property of Messold
              Technologies or its licensors.
            </p>
            <div className="mt-6 flex items-center gap-2.5">
              <a
                href="https://www.instagram.com/gocollab.io"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="GoCollab on Instagram"
                className="flex size-9 items-center justify-center rounded-full bg-deep-pink/10 text-deep-pink transition-colors hover:bg-deep-pink/15"
              >
                <Instagram className="size-4" strokeWidth={1.75} />
              </a>
              <a
                href="https://www.linkedin.com/company/messold-technologies"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Messold Technologies on LinkedIn"
                className="flex size-9 items-center justify-center rounded-full bg-deep-pink/10 text-deep-pink transition-colors hover:bg-deep-pink/15"
              >
                <Linkedin className="size-4" strokeWidth={1.75} />
              </a>
            </div>
          </div>

          <div>
            <FooterHeading>Company</FooterHeading>
            <ul className="mb-6 grid gap-2.5">
              <li>
                <FooterLink href="/about">About Us</FooterLink>
              </li>
              <li>
                <FooterLink href="/contact">Contact Us</FooterLink>
              </li>
            </ul>
            <p className="text-sm font-semibold text-foreground">{SITE_NAME}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Owned & operated by Messold Technologies
            </p>
            <p className="mt-4 text-sm leading-relaxed text-foreground/80">
              Synergy Building, IIT Delhi
              <br />
              Hauz Khas – 110016
              <br />
              New Delhi, India
            </p>
            <p className="mt-3.5 text-sm leading-relaxed text-foreground/80">
              J-6, Block J, Reserve Bank Enclave
              <br />
              Paschim Vihar
              <br />
              New Delhi – 110063, India
            </p>
          </div>

          <div>
            <FooterHeading>Contact</FooterHeading>
            <ul className="grid gap-3 text-sm">
              <li>
                <a
                  href="mailto:support@gocollab.io"
                  className="inline-flex items-center gap-2.5 text-foreground/80 transition-colors hover:text-deep-pink"
                >
                  <Mail className="size-4 shrink-0 text-deep-pink" />
                  support@gocollab.io
                </a>
              </li>
              <li>
                <a
                  href="mailto:hello@messold.com"
                  className="inline-flex items-center gap-2.5 text-foreground/80 transition-colors hover:text-deep-pink"
                >
                  <Mail className="size-4 shrink-0 text-deep-pink" />
                  hello@messold.com
                </a>
              </li>
              <li>
                <a
                  href="tel:+917291988880"
                  className="inline-flex items-center gap-2.5 text-foreground/80 transition-colors hover:text-deep-pink"
                >
                  <Phone className="size-4 shrink-0 text-deep-pink" />
                  +91 72919 88880
                </a>
              </li>
            </ul>
          </div>

          <nav aria-label="Policies">
            <FooterHeading>Policies</FooterHeading>
            <ul className="grid gap-2.5">
              {policyLinks.map(({ label, href }) => (
                <li key={href}>
                  <FooterLink href={href}>{label}</FooterLink>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <div className="grid gap-4 border-t border-blush-200 pt-6 text-xs leading-relaxed text-muted-foreground sm:grid-cols-[auto_1fr_auto] sm:items-center sm:gap-8">
          <div className="space-y-1 sm:max-w-xs">
            <p>
              © {new Date().getFullYear()} Messold Technologies. All rights
              reserved.
            </p>
            <p>Technology Platform & Creator Marketplace</p>
          </div>
          <p className="sm:border-x sm:border-blush-200 sm:px-8">
            Operated in India under the Information Technology Act, 2000;
            Digital Personal Data Protection Act, 2023; Copyright Act, 1957;
            Trade Marks Act, 1999; and applicable consumer protection and
            e-commerce regulations.
          </p>
          <a
            href="#main-content"
            className="inline-flex items-center gap-1.5 font-medium text-deep-pink transition-colors hover:text-deep-pink/80 sm:justify-self-end"
          >
            <ArrowUp className="size-3.5" strokeWidth={2.25} />
            Back to top
          </a>
        </div>
      </div>
    </footer>
  );
});
