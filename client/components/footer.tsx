import { memo } from "react";
import Link from "next/link";
import { SITE_NAME } from "@/config/site";

const shell = "mx-auto w-full max-w-site px-4 sm:px-6 lg:px-8";

export const Footer = memo(function Footer() {
  return (
    <footer className="bg-foreground text-background">
      <div className={`${shell} py-16 pb-8`}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-[1.3fr_1fr_1fr_1fr] gap-10 lg:gap-8 pb-11 border-b border-background/15">
          <div>
            <Link href="/" prefetch className="mb-3.5 flex items-center gap-2">
              <img
                src="/assets/logo.png"
                alt={SITE_NAME}
                width={24}
                height={24}
                className="h-6 w-6 rounded-md object-contain"
                loading="lazy"
                decoding="async"
              />
              <span className="font-heading text-base font-extrabold text-background tracking-tight">
                {SITE_NAME}
              </span>
            </Link>
            <p className="max-w-[240px] text-sm text-background/65">
              Built with ✦ for the creator economy.
            </p>
            <p className="mt-4.5 text-xs text-background/55 leading-relaxed">
              GoCollab is a technology platform owned and operated by Messold
              Technologies, facilitating discovery, communication, and campaign
              management between brands and creators. Use is subject to the
              Terms of Service, Privacy Policy, and Cookie Policy. All content,
              software, and trademarks remain the property of Messold
              Technologies or its licensors.
            </p>
          </div>

          <div>
            <div className="mb-3.5 text-sm font-semibold uppercase tracking-wider text-background/55">
              Company
            </div>
            <ul className="mb-5 grid gap-2.5 text-sm">
              <li>
                <Link
                  href="/about"
                  className="text-background/85 hover:text-background"
                >
                  About Us
                </Link>
              </li>
              <li>
                <Link
                  href="/contact"
                  className="text-background/85 hover:text-background"
                >
                  Contact Us
                </Link>
              </li>
            </ul>
            <p className="text-sm font-semibold text-background/80">
              {SITE_NAME}
            </p>
            <p className="mt-1 text-xs text-background/60">
              Owned & operated by Messold Technologies
            </p>
            <p className="mt-4.5 text-sm leading-relaxed text-background/80">
              Synergy Building, IIT Delhi
              <br />
              Hauz Khas – 110016
              <br />
              New Delhi, India
            </p>
            <p className="mt-3.5 text-sm leading-relaxed text-background/80">
              J-6, Block J, Reserve Bank Enclave
              <br />
              Paschim Vihar
              <br />
              New Delhi – 110063, India
            </p>
          </div>

          <div>
            <div className="mb-3.5 text-sm font-semibold uppercase tracking-wider text-background/55">
              Contact
            </div>
            <p className="mb-2.5 text-sm">
              <a
                href="mailto:support@gocollab.io"
                className="text-background/85 hover:text-background"
              >
                support@gocollab.io
              </a>
            </p>
            <p className="mb-2.5 text-sm">
              <a
                href="mailto:hello@messold.com"
                className="text-background/85 hover:text-background"
              >
                hello@messold.com
              </a>
            </p>
            <p className="text-sm text-background/80">+91 72919 88880</p>

            <div className="mt-6 mb-3 text-sm font-semibold uppercase tracking-wider text-background/55">
              Compliance
            </div>
            <ul className="grid gap-1.5 text-xs text-background/60">
              <li>Information Technology Act, 2000</li>
              <li>Digital Personal Data Protection Act, 2023</li>
              <li>Copyright Act, 1957</li>
              <li>Trade Marks Act, 1999</li>
              <li>Consumer protection & e-commerce regulations (India)</li>
            </ul>
          </div>

          <div>
            <div className="mb-3.5 text-sm font-semibold uppercase tracking-wider text-background/55">
              Policies
            </div>
            <ul className="grid gap-2.5 text-sm">
              {[
                { label: "Privacy Policy", href: "/legal/privacy" },
                { label: "Terms of Service", href: "/legal/terms" },
                { label: "Cookie Policy", href: "/legal/cookie" },
                { label: "Community Guidelines", href: "/legal/guidelines" },
                {
                  label: "Refund & Cancellation Policy",
                  href: "/legal/terms#refunds-cancellations-and-disputes",
                },
              ].map(({ label, href }) => (
                <li key={label}>
                  <Link
                    href={href}
                    className="text-background/85 hover:text-background"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2.5 pt-6 text-xs text-background/45">
          <p>
            © {new Date().getFullYear()} Messold Technologies. All rights
            reserved.
          </p>
          <p>Technology Platform & Creator Marketplace</p>
        </div>
      </div>
    </footer>
  );
});
