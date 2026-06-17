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

const CREATOR_ORDERS_TABS = '[data-tour="creator-orders-tabs"]';
const CREATOR_ORDERS_TAB = {
  all: '[data-tour="creator-orders-tab-all"]',
  new: '[data-tour="creator-orders-tab-new"]',
  active: '[data-tour="creator-orders-tab-active"]',
  revisions: '[data-tour="creator-orders-tab-revisions"]',
  delivered: '[data-tour="creator-orders-tab-delivered"]',
  completed: '[data-tour="creator-orders-tab-completed"]',
  cancelled: '[data-tour="creator-orders-tab-cancelled"]',
} as const;

const CREATOR_PROFILE = {
  overview: '[data-tour="creator-profile-overview"]',
  preview: '[data-tour="creator-profile-preview"]',
  edit: '[data-tour="creator-profile-edit"]',
  stats: '[data-tour="creator-profile-stats"]',
  portfolio: '[data-tour="creator-profile-portfolio"]',
  package: '[data-tour="creator-profile-package"]',
} as const;

const CREATOR_PROFILE_EDIT = {
  nav: '[data-tour="creator-profile-edit-nav"]',
  media: '[data-tour="creator-profile-edit-media"]',
  basics: '[data-tour="creator-profile-edit-basics"]',
  niche: '[data-tour="creator-profile-edit-niche"]',
  packages: '[data-tour="creator-profile-edit-packages"]',
  portfolio: '[data-tour="creator-profile-edit-portfolio"]',
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
      tour: "creator-orders-v2",
      steps: [
        {
          icon: "📂",
          title: "Order tabs",
          content:
            "Your orders are grouped by status. Use these tabs to jump between new requests, active work, and completed collaborations.",
          selector: CREATOR_ORDERS_TABS,
          side: "bottom",
        },
        {
          icon: "📋",
          title: "All Orders",
          content:
            "See every collaboration in one list. Search by order ID or brand from here.",
          selector: CREATOR_ORDERS_TAB.all,
          side: "bottom-left",
        },
        {
          icon: "✨",
          title: "New Requests",
          content:
            "Incoming briefs from brands land here. Review requirements and accept or decline each request.",
          selector: CREATOR_ORDERS_TAB.new,
          side: "bottom-left",
        },
        {
          icon: "🎬",
          title: "Active",
          content:
            "Orders you're working on right now — from product receipt through content creation.",
          selector: CREATOR_ORDERS_TAB.active,
          side: "bottom-left",
        },
        {
          icon: "🔄",
          title: "Revisions",
          content:
            "When a brand asks for changes, those orders appear here until you resubmit.",
          selector: CREATOR_ORDERS_TAB.revisions,
          side: "bottom",
        },
        {
          icon: "📤",
          title: "Delivered",
          content:
            "Content you've submitted and is waiting for brand review.",
          selector: CREATOR_ORDERS_TAB.delivered,
          side: "bottom",
        },
        {
          icon: "✅",
          title: "Completed",
          content: "Finished collaborations and payout-ready orders.",
          selector: CREATOR_ORDERS_TAB.completed,
          side: "bottom-right",
        },
        {
          icon: "🚫",
          title: "Cancelled",
          content: "Declined, refunded, or disputed orders are kept here for your records.",
          selector: CREATOR_ORDERS_TAB.cancelled,
          side: "bottom-right",
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
      tour: "creator-portfolio-v2",
      steps: [
        {
          icon: "🎬",
          title: "Your portfolio",
          content:
            "Upload and organize your best work here so brands can see what you create.",
          selector: '[data-tour="creator-portfolio-header"]',
          side: "bottom-left",
        },
        {
          icon: "➕",
          title: "Add new work",
          content:
            "Upload videos and tag them by industry so the right brands can find you.",
          selector: '[data-tour="creator-portfolio-upload"]',
          side: "bottom-left",
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
      tour: "creator-account-v3",
      steps: [
        {
          icon: "👤",
          title: "Your public profile",
          content:
            "This is how brands see you — photo, bio, categories, and location.",
          selector: CREATOR_PROFILE.overview,
          side: "bottom-left",
        },
        {
          icon: "🔗",
          title: "Preview public profile",
          content:
            "Open your live public page in a new tab to see exactly what brands see when they discover you.",
          selector: CREATOR_PROFILE.preview,
          side: "bottom-left",
        },
        {
          icon: "✏️",
          title: "Edit profile",
          content:
            "Update your details, packages, and portfolio anytime from here.",
          selector: CREATOR_PROFILE.edit,
          side: "bottom-left",
        },
        {
          icon: "📊",
          title: "Performance stats",
          content:
            "Track your orders, earnings, and ratings at a glance.",
          selector: CREATOR_PROFILE.stats,
          side: "bottom",
        },
        {
          icon: "🎬",
          title: "Top portfolio",
          content:
            "Your best work is highlighted here. Manage the full library from Portfolio.",
          selector: CREATOR_PROFILE.portfolio,
          side: "bottom",
        },
        {
          icon: "💰",
          title: "Your package",
          content:
            "Brands see your starting price and add-ons. Edit pricing here or in profile settings.",
          selector: CREATOR_PROFILE.package,
          side: "bottom-left",
        },
      ],
    },
  },
  {
    match: (p) => p.startsWith("/creator/settings/profile"),
    definition: {
      tour: "creator-settings-profile-v3",
      steps: [
        {
          icon: "🧭",
          title: "Profile sections",
          content:
            "Jump between sections using this menu as you update your profile.",
          selector: CREATOR_PROFILE_EDIT.nav,
          side: "right",
        },
        {
          icon: "📸",
          title: "Photo & intro reel",
          content:
            "Upload a profile photo and short intro video — brands see these first.",
          selector: CREATOR_PROFILE_EDIT.media,
          side: "bottom-left",
        },
        {
          icon: "📝",
          title: "Basic details",
          content:
            "Set your display name, contact info, and the bio brands read first.",
          selector: CREATOR_PROFILE_EDIT.basics,
          side: "bottom-left",
        },
        {
          icon: "✨",
          title: "Niche & content",
          content:
            "Choose your content categories, style, and languages — this controls which brand briefs you match with.",
          selector: CREATOR_PROFILE_EDIT.niche,
          side: "bottom-left",
        },
        {
          icon: "📦",
          title: "Packages",
          content:
            "Set your base package price, delivery time, and optional add-ons.",
          selector: CREATOR_PROFILE_EDIT.packages,
          side: "bottom",
        },
        {
          icon: "🎬",
          title: "Portfolio",
          content:
            "Add and manage showcase videos that appear on your public profile.",
          selector: CREATOR_PROFILE_EDIT.portfolio,
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
