import { memo } from "react";
import Link from "next/link";
import { Sticker } from "@/components/landing/marketing/sticker";
import { SITE_NAME } from "@/config/site";

const shell = "mx-auto w-full max-w-site px-4 sm:px-6 lg:px-8";

const columns = [
  {
    title: "Platform",
    links: [
      { href: "/brand/creators", label: "For Brands" },
      { href: "/login?role=creator", label: "For Creators" },
      { href: "/brand/creators", label: "Browse Creators" },
      { href: "/#pricing", label: "Pricing" },
    ],
  },
  {
    title: "Company",
    links: [
      { href: "/about", label: "About" },
      { href: "/contact", label: "Contact Us" },
      { href: "/blog", label: "Blog" },
    ],
  },
  {
    title: "Legal",
    links: [
      { href: "/legal/privacy", label: "Privacy Policy" },
      { href: "/legal/terms", label: "Terms of Service" },
      { href: "/legal/terms#refunds-cancellations-and-disputes", label: "Refund Policy" },
      { href: "/legal/terms#brand-content-product-claims-and-regulated-categories", label: "Creator Guidelines" },
    ],
  },
];

export const Footer = memo(function Footer() {
  return (
    <footer className="bg-foreground text-background">
      <div
        className={`${shell} grid gap-10 py-16 md:grid-cols-2 lg:grid-cols-5`}
      >
        <div className="lg:col-span-2">
          <Link href="/" prefetch className="inline-flex shrink-0 items-center">
            {/* eslint-disable-next-line @next/next/no-img-element -- footer brand mark matches navbar asset */}
            <img
              src="/brand-logo.png"
              alt={SITE_NAME}
              width={688}
              height={160}
              className="h-11 max-h-none w-auto max-w-[min(260px,calc(100vw-48px))] object-contain object-left sm:h-12"
              loading="lazy"
              decoding="async"
              draggable={false}
            />
          </Link>
          <p className="mt-4 max-w-sm text-background/70">
            UGC without the DM drama. The marketplace where creators and brands
            collaborate to create authentic content that actually sells.
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            <Sticker tone="lime">Pay Safe</Sticker>
            <Sticker tone="pink">Refund Safe</Sticker>
            <Sticker tone="sky">Verified Creators</Sticker>
          </div>
        </div>

        {columns.map(({ title, links }) => (
          <div key={title}>
            <h4 className="font-heading text-lg font-bold text-lime">
              {title}
            </h4>
            <ul className="mt-4 space-y-2.5">
              {links.map(({ href, label }) => (
                <li key={`${title}-${label}`}>
                  <Link
                    href={href}
                    prefetch
                    className="text-sm text-background/70 hover:text-background"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="border-t border-background/10">
        <div
          className={`${shell} flex flex-col items-center justify-between gap-3 py-6 text-center text-sm text-background/60 sm:flex-row sm:text-left`}
        >
          <p>
            © {new Date().getFullYear()} {SITE_NAME}. Made for brands that need
            content and creators who want to get paid.
          </p>
          <p>Built with ✦ for the creator economy.</p>
        </div>
      </div>
    </footer>
  );
});
