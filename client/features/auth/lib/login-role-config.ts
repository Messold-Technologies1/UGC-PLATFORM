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
  bullets: LoginBullet[];
  stat?: { big: string; label: string };
  quote: string;
  author: string;
  authorRole: string;
  authorInitials: string;
  formTitle: string;
  formSub: string;
  submitLabel: string;
  signupCta: string;
  signupLine: string;
  signupHref: string;
  theme: {
    accent: string;
    accent2: string;
    tint: string;
    heroGrad: string;
    hairline: string;
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
    headline: ["Pick up the shortlist exactly where you left it.", ""],
    sub: "Saved creators, half-written briefs and everything currently in production — all still sitting where you put them.",
    bullets: [
      {
        icon: Search,
        title: "Your saved creators",
        desc: "The shortlist you built last campaign, with rates and delivery times still visible.",
      },
      {
        icon: Film,
        title: "Collaborations in flight",
        desc: "See what has shipped, what needs approval and what is awaiting a revision.",
      },
      {
        icon: ShoppingBag,
        title: "New in your categories",
        desc: "Creators who joined since your last search, in the niches you actually hire for.",
      },
    ],

    quote:
      "We shipped 40 ad-ready videos in a month — CTR beat our benchmark by 28%.",
    author: "Yuti Edward",
    authorRole: "Growth Lead, Udd Studio",
    authorInitials: "YW",
    formTitle: "Welcome back",
    formSub: "Log in to continue exploring creators and managing collaborations.",
    submitLabel: "Log in as Brand",
    signupCta: "Create a brand account",
    signupLine: "New to GoCollab as a brand?",
    signupHref: "/register/brand",
    theme: {
      accent: "#6e2545",
      accent2: "#6e2545",
      tint: "#f9f5f7",
      heroGrad: "#f9f5f7",
      hairline: "#e8dde2",
      blob: "rgba(110,37,69,.12)",
      dot: "rgba(110,37,69,.10)",
      highlight: "transparent",
    },
  },

  creator: {
    key: "creator",
    name: "Creator",
    icon: Camera,
    eyebrow: "For Creators",
    tag: "Creator login",
    headline: ["Your profile kept working while you were shooting.", ""],
    sub: "Nothing pauses when you close the app. Brands keep searching, keep reading your rates, keep watching your work.",
    bullets: [
      {
        icon: Camera,
        title: "Questions it answered for you",
        desc: "Rates, deliverables, delivery time, usage rights — all read before anyone typed a message.",
      },
      {
        icon: Layers,
        title: "One link doing the rounds",
        desc: "Every time you send your profile, it goes to work again — no new PDF, no fresh rate card, no repeat explaining.",
      },
      {
        icon: CheckCircle2,
        title: "Work waiting for you here",
        desc: "New briefs, approvals and revisions are all queued in one place, not scattered across chats.",
      },
    ],
    quote:
      "I went from 2 brand deals a month to fully booked. The packages feature changed everything.",
    author: "Elina Sadh",
    authorRole: "Beauty creator, Mumbai",
    authorInitials: "ES",
    formTitle: "Welcome back",
    formSub: "Log in to manage your profile, orders and deliveries.",
    submitLabel: "Log in as Creator",
    signupCta: "Create a creator account",
    signupLine: "New to GoCollab as a creator?",
    signupHref: "/register/creator",
    theme: {
      accent: "#B3123F",
      accent2: "#B3123F",
      tint: "#FDF8F8",
      heroGrad: "#FDF8F8",
      hairline: "#EDE8EA",
      blob: "rgba(179,18,63,.12)",
      dot: "rgba(150,90,90,.10)",
      highlight: "transparent",
    },
  },

  agency: {
    key: "agency",
    name: "Agency",
    icon: Building2,
    eyebrow: "For Agencies",
    tag: "Agency login",
    headline: ["Run UGC for every client, in one place.", ""],
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
    formTitle: "Welcome back",
    formSub: "Log in to manage your client workspaces and orders.",
    submitLabel: "Log in as Agency",
    signupCta: "Set up an agency account",
    signupLine: "New to GoCollab as an agency?",
    signupHref: "/register/agency",
    theme: {
      accent: "#0e9384",
      accent2: "#4fd1c5",
      tint: "#F6FAF9",
      heroGrad: "#F6FAF9",
      hairline: "#EDE8EA",
      blob: "rgba(14,147,132,.20)",
      dot: "rgba(70,150,138,.15)",
      highlight: "transparent",
    },
  },
};
