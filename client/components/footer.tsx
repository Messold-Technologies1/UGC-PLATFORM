import Link from "next/link";
import { Sparkles } from "lucide-react";

const columns = [
  {
    title: "Platform",
    links: [
      { href: "/creator/dashboard", label: "For Creators" },
      { href: "/brand/dashboard", label: "For Brands" },
      { href: "/pricing", label: "Pricing" },
    ],
  },
  {
    title: "Company",
    links: [
      { href: "/about", label: "About" },
      { href: "/contact", label: "Contact" },
      { href: "/blog", label: "Blog" },
    ],
  },
  {
    title: "Legal",
    links: [
      { href: "/privacy", label: "Privacy" },
      { href: "/terms", label: "Terms" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="border-t border-border bg-muted/30">
      <div className="mx-auto max-w-[1440px] px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <Link href="/" className="flex items-center gap-2">
              <div className="bg-foreground flex size-7 items-center justify-center rounded-lg">
                <Sparkles className="size-3.5 text-white" />
              </div>
              <span className="text-sm font-bold">UGC Platform</span>
            </Link>
            <p className="mt-3 max-w-xs text-xs leading-relaxed text-muted-foreground">
              The marketplace connecting talented creators with brands that need authentic,
              high-performing user-generated content.
            </p>
          </div>

          {columns.map(({ title, links }) => (
            <div key={title}>
              <p className="text-xs font-medium uppercase tracking-wider text-foreground">
                {title}
              </p>
              <ul className="mt-3 space-y-2">
                {links.map(({ href, label }) => (
                  <li key={href}>
                    <Link
                      href={href}
                      className="text-xs text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-border pt-6 sm:flex-row">
          <p className="text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} UGC Platform. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
