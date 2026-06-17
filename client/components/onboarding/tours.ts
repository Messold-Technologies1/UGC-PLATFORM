import type { Step } from "onborda";

/**
 * Onborda product tours for the brand and creator workspaces.
 *
 * Each route maps to a single self-contained tour whose steps anchor to small,
 * concrete `[data-tour="..."]` elements (navbar items, page headers, primary
 * CTAs). We deliberately avoid anchoring to the full-page content wrapper — that
 * would spotlight the entire viewport and the card would float over the whole
 * page. The runtime filters out any step whose target is missing or not visible
 * (e.g. the desktop navbar on mobile) before the tour starts.
 */

export type TourScope = "brand" | "creator";

export interface TourDefinition {
  /** Unique tour id, used as the Onborda tour name and the persistence key. */
  tour: string;
  steps: Step[];
}

// Shared, layout-level anchors available across dashboard pages.
const HEADER = '[data-tour="page-header"]';
const NOTIFICATIONS = '[data-tour="nav-notifications"]';
const PROFILE = '[data-tour="nav-profile"]';

// Role navigation anchors (desktop navbar).
const NAV = {
  brandCreators: '[data-tour="nav-brand-creators"]',
  brandOrders: '[data-tour="nav-brand-orders"]',
  brandMessages: '[data-tour="nav-brand-messages"]',
  brandBriefs: '[data-tour="nav-brand-briefs"]',
  brandWishlists: '[data-tour="nav-brand-wishlists"]',
  creatorOrders: '[data-tour="nav-creator-orders"]',
  creatorMessages: '[data-tour="nav-creator-messages"]',
  creatorPortfolio: '[data-tour="nav-creator-portfolio"]',
} as const;

interface TourRoute {
  /** Returns true when this tour should run for the given pathname. */
  match: (pathname: string) => boolean;
  definition: TourDefinition;
}

const BRAND_ROUTES: TourRoute[] = [
  {
    match: (p) => p.startsWith("/brand/briefs/create"),
    definition: {
      tour: "brand-briefs-create",
      steps: [
        {
          icon: "🧩",
          title: "Build your brief",
          content:
            "Fill in product details, content requirements, and shoot preferences. Everything is saved as a reusable brief you can attach to orders.",
          selector: NAV.brandBriefs,
          side: "bottom",
        },
      ],
    },
  },
  {
    match: (p) => /^\/brand\/briefs\/[^/]+$/.test(p),
    definition: {
      tour: "brand-brief-detail",
      steps: [
        {
          icon: "📄",
          title: "Brief details",
          content:
            "Review everything captured in this brief. Reuse it whenever you create a new order.",
          selector: NAV.brandBriefs,
          side: "bottom",
        },
      ],
    },
  },
  {
    match: (p) => p === "/brand/briefs",
    definition: {
      tour: "brand-briefs",
      steps: [
        {
          icon: "📝",
          title: "Campaign briefs",
          content:
            "Save reusable briefs that describe exactly what you need from creators.",
          selector: '[data-tour="brand-briefs-heading"]',
          side: "bottom",
        },
        {
          icon: "➕",
          title: "Create a brief",
          content:
            "Start a new brief here — you can attach it to orders whenever you hire a creator.",
          selector: '[data-tour="brand-briefs-create"]',
          side: "left",
        },
      ],
    },
  },
  {
    match: (p) => /^\/brand\/creators\/[^/]+$/.test(p),
    definition: {
      tour: "brand-creator-detail",
      steps: [
        {
          icon: "👤",
          title: "Creator profile",
          content:
            "Explore the creator's portfolio, stats, and pricing — then start an order or save them to a wishlist.",
          selector: NAV.brandCreators,
          side: "bottom",
        },
      ],
    },
  },
  {
    match: (p) => p === "/brand/creators",
    definition: {
      tour: "brand-creators",
      steps: [
        {
          icon: "🔍",
          title: "Discover creators",
          content:
            "This is the Creators marketplace — browse and filter vetted creators, then open any profile to learn more.",
          selector: NAV.brandCreators,
          side: "bottom",
        },
        {
          icon: "📦",
          title: "Track your orders",
          content:
            "Once you hire a creator, manage every collaboration from here.",
          selector: NAV.brandOrders,
          side: "bottom",
        },
        {
          icon: "💬",
          title: "Stay in touch",
          content: "Chat directly with creators about your campaigns.",
          selector: NAV.brandMessages,
          side: "bottom",
        },
        {
          icon: "🔔",
          title: "Notifications",
          content:
            "New applications, messages, and updates all show up here.",
          selector: NOTIFICATIONS,
          side: "bottom-right",
        },
      ],
    },
  },
  {
    match: (p) => p === "/brand/orders",
    definition: {
      tour: "brand-orders",
      steps: [
        {
          icon: "📦",
          title: "Your orders",
          content:
            "Every collaboration you start lives here. Track each one from briefing through delivery.",
          selector: NAV.brandOrders,
          side: "bottom",
        },
        {
          icon: "💬",
          title: "Coordinate with creators",
          content: "Message a creator anytime to align on deliverables.",
          selector: NAV.brandMessages,
          side: "bottom",
        },
      ],
    },
  },
  {
    match: (p) => p.startsWith("/brand/orders/"),
    definition: {
      tour: "brand-order-detail",
      steps: [
        {
          icon: "📄",
          title: "Order details",
          content:
            "Track this collaboration's progress and review deliverables as the creator submits them.",
          selector: NAV.brandOrders,
          side: "bottom",
        },
      ],
    },
  },
  {
    match: (p) => p === "/brand/messages",
    definition: {
      tour: "brand-messages",
      steps: [
        {
          icon: "💬",
          title: "Messages",
          content: "All of your conversations with creators in one place.",
          selector: NAV.brandMessages,
          side: "bottom",
        },
      ],
    },
  },
  {
    match: (p) => p.startsWith("/brand/wishlists"),
    definition: {
      tour: "brand-wishlists",
      steps: [
        {
          icon: "❤️",
          title: "Wishlists",
          content:
            "Organize creators into shortlists so your team can collaborate on who to hire.",
          selector: NAV.brandWishlists,
          side: "bottom",
        },
      ],
    },
  },
  {
    match: (p) => p === "/brand/campaigns",
    definition: {
      tour: "brand-campaigns",
      steps: [
        {
          icon: "📣",
          title: "Campaigns",
          content:
            "Plan and manage UGC campaigns to brief multiple creators at once.",
          selector: HEADER,
          side: "bottom",
        },
        {
          icon: "➕",
          title: "New campaign",
          content:
            "Launch a campaign to start receiving content from creators.",
          selector: '[data-tour="brand-campaigns-create"]',
          side: "left",
        },
      ],
    },
  },
  {
    match: (p) => p.startsWith("/brand/account"),
    definition: {
      tour: "brand-account",
      steps: [
        {
          icon: "🏢",
          title: "Your brand profile",
          content:
            "Keep your brand details up to date — creators see this when you reach out. Manage account options from this menu.",
          selector: PROFILE,
          side: "bottom-right",
        },
      ],
    },
  },
  {
    match: (p) => p.startsWith("/brand/settings"),
    definition: {
      tour: "brand-settings",
      steps: [
        {
          icon: "⚙️",
          title: "Settings",
          content:
            "Manage your brand profile, team, and workspace preferences here.",
          selector: HEADER,
          side: "bottom",
        },
      ],
    },
  },
];

const CREATOR_ROUTES: TourRoute[] = [
  {
    match: (p) => p === "/creator/dashboard",
    definition: {
      tour: "creator-dashboard",
      steps: [
        {
          icon: "👋",
          title: "Welcome to your dashboard",
          content:
            "Your activity, earnings, and recent updates at a glance.",
          selector: '[data-tour="creator-dashboard-header"]',
          side: "bottom",
        },
        {
          icon: "📦",
          title: "Your orders",
          content: "Manage active collaborations and deliverables here.",
          selector: NAV.creatorOrders,
          side: "bottom",
        },
        {
          icon: "🎬",
          title: "Showcase your work",
          content: "Build a portfolio that helps brands discover you.",
          selector: NAV.creatorPortfolio,
          side: "bottom",
        },
        {
          icon: "💬",
          title: "Talk to brands",
          content: "Discuss briefs and deliverables in Messages.",
          selector: NAV.creatorMessages,
          side: "bottom",
        },
        {
          icon: "🔔",
          title: "Notifications",
          content: "Invites, messages, and payout updates appear here.",
          selector: NOTIFICATIONS,
          side: "bottom-right",
        },
      ],
    },
  },
  {
    match: (p) => p === "/creator/orders",
    definition: {
      tour: "creator-orders",
      steps: [
        {
          icon: "📦",
          title: "Your orders",
          content:
            "Every collaboration you take on shows here. Track each from brief to delivery.",
          selector: NAV.creatorOrders,
          side: "bottom",
        },
        {
          icon: "💬",
          title: "Coordinate with brands",
          content: "Message the brand to clarify requirements as you work.",
          selector: NAV.creatorMessages,
          side: "bottom",
        },
      ],
    },
  },
  {
    match: (p) => p.startsWith("/creator/orders/"),
    definition: {
      tour: "creator-order-detail",
      steps: [
        {
          icon: "📄",
          title: "Order details",
          content:
            "Everything about this collaboration — the brief, status, and your deliverables.",
          selector: NAV.creatorOrders,
          side: "bottom",
        },
      ],
    },
  },
  {
    match: (p) => p === "/creator/messages",
    definition: {
      tour: "creator-messages",
      steps: [
        {
          icon: "💬",
          title: "Messages",
          content: "All of your brand conversations in one place.",
          selector: NAV.creatorMessages,
          side: "bottom",
        },
      ],
    },
  },
  {
    match: (p) => p.startsWith("/creator/portfolio/upload"),
    definition: {
      tour: "creator-portfolio-upload",
      steps: [
        {
          icon: "⬆️",
          title: "Add to your portfolio",
          content:
            "Upload media and add details to showcase this piece of work.",
          selector: NAV.creatorPortfolio,
          side: "bottom",
        },
      ],
    },
  },
  {
    match: (p) => p.startsWith("/creator/portfolio"),
    definition: {
      tour: "creator-portfolio",
      steps: [
        {
          icon: "🎬",
          title: "Your portfolio",
          content:
            "Upload your best work so brands can see exactly what you create.",
          selector: NAV.creatorPortfolio,
          side: "bottom",
        },
      ],
    },
  },
  {
    match: (p) => p === "/creator/campaigns",
    definition: {
      tour: "creator-campaigns",
      steps: [
        {
          icon: "📣",
          title: "Campaigns",
          content:
            "Browse open brand campaigns and apply to the ones that fit you.",
          selector: HEADER,
          side: "bottom",
        },
      ],
    },
  },
  {
    match: (p) => p.startsWith("/creator/account"),
    definition: {
      tour: "creator-account",
      steps: [
        {
          icon: "👤",
          title: "Your profile",
          content:
            "This is what brands see. Manage your account and profile from this menu.",
          selector: PROFILE,
          side: "bottom-right",
        },
      ],
    },
  },
  {
    match: (p) => p.startsWith("/creator/settings/profile"),
    definition: {
      tour: "creator-settings-profile",
      steps: [
        {
          icon: "✏️",
          title: "Edit your profile",
          content:
            "Update your display name, bio, profile picture, and social links.",
          selector: HEADER,
          side: "bottom",
        },
      ],
    },
  },
  {
    match: (p) => p.startsWith("/creator/settings"),
    definition: {
      tour: "creator-settings",
      steps: [
        {
          icon: "⚙️",
          title: "Settings",
          content:
            "Manage your profile, notifications, and payout preferences.",
          selector: HEADER,
          side: "bottom",
        },
      ],
    },
  },
];

/** Resolve the tour that should run for the given workspace + pathname. */
export function resolveTour(
  scope: TourScope,
  pathname: string,
): TourDefinition | null {
  const routes = scope === "brand" ? BRAND_ROUTES : CREATOR_ROUTES;
  return routes.find((route) => route.match(pathname))?.definition ?? null;
}
