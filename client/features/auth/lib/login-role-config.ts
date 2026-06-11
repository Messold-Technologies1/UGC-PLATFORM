import type { LucideIcon } from "lucide-react";
import {
  Megaphone,
  Camera,
  Building2,
  Search,
  Film,
  ShoppingBag,
  Layers,
  CheckCircle2,
  LayoutGrid,
  Users,
  Zap,
} from "lucide-react";

export const LOGIN_ROLES = ["brand", "creator", "agency"] as const;
export type LoginRole = (typeof LOGIN_ROLES)[number];

export interface LoginBullet {
  icon: LucideIcon;
  title: string;
  desc: string;
}

export interface LoginRoleConfig {
  key: LoginRole;
  name: string;
  icon: LucideIcon;
  eyebrow: string;
  tag: string;
  headline: [string, string];
  sub: string;
  bullets: [LoginBullet, LoginBullet, LoginBullet];
  stat: { big: string; label: string };
  quote: string;
  author: string;
  authorRole: string;
  authorInitials: string;
  formTitle: string;
  formSub: string;
  signupCta: string;
  signupLine: string;
  signupHref: string;
  theme: {
    accent: string;
    accent2: string;
    tint: string;
    heroGrad: string;
    blob: string;
    dot: string;
    highlight: string;
  };
}


const ROLE_SET = new Set<string>(LOGIN_ROLES);
export function parseLoginRole(value: string | null): LoginRole | null {
  if (!value) return null;
  const lower = value.toLowerCase();
  return ROLE_SET.has(lower) ? (lower as LoginRole) : null;
}

const STORAGE_KEY = "gocollab:login-role";

export function getRememberedRole(): LoginRole | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return parseLoginRole(stored);
  } catch {
    return null;
  }
}

export function setRememberedRole(role: LoginRole): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, role);
  } catch {
  }
}

export function clearRememberedRole(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
  }
}

export const ROLE_CONFIGS: Record<LoginRole, LoginRoleConfig> = {
  brand: {
    key: "brand",
    name: "Brand",
    icon: Megaphone,
    eyebrow: "For Brands",
    tag: "Brand login",
    headline: ["Launch UGC that", "actually converts."],
    sub: "Discover vetted creators, brief them in minutes, and get\nscroll-stopping videos that are ready for paid — all in one place.",
    bullets: [
      {
        icon: Search,
        title: "Browse 12,000+ vetted creators",
        desc: "Filter by niche, language, budget & style.",
      },
      {
        icon: Film,
        title: "Brief & book in minutes",
        desc: "Pick a package, add-ons, and check out securely.",
      },
      {
        icon: ShoppingBag,
        title: "Manage every order in one place",
        desc: "Track delivery, revisions and approvals.",
      },
    ],
    stat: { big: "12,000+", label: "creators ready to collaborate" },
    quote:
      "We shipped 40 ad-ready videos in a month — CTR beat our benchmark by 28%.",
    author: "Priya Menon",
    authorRole: "Growth Lead, Plix",
    authorInitials: "PM",
    formTitle: "Log in to your brand workspace",
    formSub: "Welcome back. Pick up right where your campaigns left off.",
    signupCta: "Create a brand account",
    signupLine: "New to GoCollab as brands?",
    signupHref: "/register/brand",
    theme: {
      accent: "#5138ed",
      accent2: "#7c6cf5",
      tint: "#eef0fe",
      heroGrad:
        "linear-gradient(165deg, #eef5fe 0%, #e8eefd 55%, #d7e4fb 100%)",
      blob: "rgba(62,118,239,.22)",
      dot: "rgba(80,110,160,.16)",
      highlight: "transparent",
    },
  },

  creator: {
    key: "creator",
    name: "Creator",
    icon: Camera,
    eyebrow: "For Creators",
    tag: "Creator login",
    headline: ["Get booked by", "brands you love."],
    sub: "Show off your reels, set your own packages, and get paid securely for every collaboration you take on.",
    bullets: [
      {
        icon: Camera,
        title: "Showcase your best reels",
        desc: "A profile that sells you 24/7.",
      },
      {
        icon: Layers,
        title: "Set your own packages & rates",
        desc: "You decide pricing, delivery and add-ons.",
      },
      {
        icon: CheckCircle2,
        title: "Get paid safely, on time",
        desc: "Funds held in escrow until you deliver.",
      },
    ],
    stat: { big: "₹2.4Cr+", label: "paid out to creators so far" },
    quote:
      "I went from 2 brand deals a month to fully booked. The packages feature changed everything.",
    author: "Aanya Kapoor",
    authorRole: "Beauty creator, Mumbai",
    authorInitials: "AK",
    formTitle: "Log in to your creator studio",
    formSub: "Welcome back. Your next collab could be one login away.",
    signupCta: "Create a creator account",
    signupLine: "New to GoCollab as creators?",
    signupHref: "/register/creator",
    theme: {
      accent: "#ef3e51",
      accent2: "#ff8a5b",
      tint: "#fff1f2",
      heroGrad:
        "linear-gradient(165deg, #fef5ee 0%, #fde9e8 55%, #fbd9d7 100%)",
      blob: "rgba(239,62,81,.20)",
      dot: "rgba(150,90,90,.16)",
      highlight: "#ccff00",
    },
  },

  agency: {
    key: "agency",
    name: "Agency",
    icon: Building2,
    eyebrow: "For Agencies",
    tag: "Agency login",
    headline: ["Run UGC for every", "client, in one place."],
    sub: "Manage multiple brand workspaces, invite your team, and keep billing and reporting consolidated across clients.",
    bullets: [
      {
        icon: LayoutGrid,
        title: "Multi-brand workspaces",
        desc: "Switch between every client in one login.",
      },
      {
        icon: Users,
        title: "Invite your whole team",
        desc: "Seats, roles and permissions per brand.",
      },
      {
        icon: Zap,
        title: "Consolidated billing & reporting",
        desc: "One invoice, performance across clients.",
      },
    ],
    stat: { big: "1 login", label: "for all of your clients" },
    quote:
      "Onboarding 9 clients onto GoCollab took a week. Now everything runs from one dashboard.",
    author: "Rahul Verma",
    authorRole: "Founder, Spark Media",
    authorInitials: "RV",
    formTitle: "Log in to your agency workspace",
    formSub: "Welcome back. All your clients, right where you left them.",
    signupCta: "Set up an agency account",
    signupLine: "New to GoCollab as agencies?",
    signupHref: "/register/agency",
    theme: {
      accent: "#0e9384",
      accent2: "#4fd1c5",
      tint: "#ecfdf7",
      heroGrad:
        "linear-gradient(165deg, #eafaf6 0%, #def5ef 55%, #cbeee4 100%)",
      blob: "rgba(14,147,132,.20)",
      dot: "rgba(70,150,138,.15)",
      highlight: "transparent",
    },
  },
};
