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
  /** When set, auto-start waits until this anchor is mounted (e.g. async page content). */
  readySelector?: string;
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

const BRAND_WISHLISTS = {
  sidebar: '[data-tour="brand-wishlists-sidebar"]',
  create: '[data-tour="brand-wishlists-create"]',
  list: '[data-tour="brand-wishlists-list"]',
  browse: '[data-tour="brand-wishlists-browse"]',
  empty: '[data-tour="brand-wishlists-empty"]',
  mobileSwitch: '[data-tour="brand-wishlists-mobile-switch"]',
  title: '[data-tour="brand-wishlists-title"]',
  addCreators: '[data-tour="brand-wishlists-add-creators"]',
  removeCreators: '[data-tour="brand-wishlists-remove-creators"]',
  share: '[data-tour="brand-wishlists-share"]',
  makePrivate: '[data-tour="brand-wishlists-make-private"]',
  rename: '[data-tour="brand-wishlists-rename"]',
  delete: '[data-tour="brand-wishlists-delete"]',
  creators: '[data-tour="brand-wishlists-creators"]',
} as const;

const BRAND_CREATORS = {
  filters: '[data-tour="brand-creators-filters"]',
  grid: '[data-tour="brand-creators-grid"]',
} as const;

interface TourRoute {
  /** Returns true when this tour should run for the given pathname. */
  match: (pathname: string) => boolean;
  definition: TourDefinition;
}

const BRAND_ROUTES: TourRoute[] = [
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
      tour: "brand-creators-v2",
      steps: [
        {
          icon: "🔍",
          title: "Search & filters",
          content:
            "Use Smart search AI or manual filters to find creators. Search by name, city, or bio, then refine with category, format, price, language, and more.",
          selector: BRAND_CREATORS.filters,
          side: "bottom",
        },
        {
          icon: "🎬",
          title: "Creator cards",
          content:
            "Browse video previews, save creators to a wishlist, and open any card to view their full profile or start an order.",
          selector: BRAND_CREATORS.grid,
          side: "top",
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
          pointerPadding: 10,
          pointerRadius: 14,
        },
      ],
    },
  },
  {
    match: (p) => /^\/brand\/wishlists\/[^/]+$/.test(p),
    definition: {
      tour: "brand-wishlists-v3",
      readySelector: BRAND_WISHLISTS.title,
      steps: [
        {
          icon: "📁",
          title: "Wishlist sidebar",
          content:
            "All your shortlists live here. Switch between lists and see how many creators you've saved in each.",
          selector: BRAND_WISHLISTS.sidebar,
          side: "right",
        },
        {
          icon: "➕",
          title: "Create a wishlist",
          content:
            "Start a new shortlist for a campaign, launch, or team review.",
          selector: BRAND_WISHLISTS.create,
          side: "left",
          pointerPadding: 10,
          pointerRadius: 12,
        },
        {
          icon: "📋",
          title: "Your wishlists",
          content:
            "Open any list to view saved creators, pricing, and collaboration options.",
          selector: BRAND_WISHLISTS.list,
          side: "right",
        },
        {
          icon: "🔍",
          title: "Browse creators",
          content:
            "Jump back to the marketplace to discover and save more creators.",
          selector: BRAND_WISHLISTS.browse,
          side: "right",
        },
        {
          icon: "📱",
          title: "Switch wishlists",
          content:
            "On mobile, use this dropdown to jump between your wishlists.",
          selector: BRAND_WISHLISTS.mobileSwitch,
          side: "bottom-left",
        },
        {
          icon: "✏️",
          title: "Wishlist name",
          content:
            "Click the title to rename this list anytime.",
          selector: BRAND_WISHLISTS.title,
          side: "bottom-left",
        },
        {
          icon: "➕",
          title: "Add creators",
          content:
            "Browse the marketplace and save creators to this wishlist.",
          selector: BRAND_WISHLISTS.addCreators,
          side: "bottom",
          pointerPadding: 10,
          pointerRadius: 12,
        },
        {
          icon: "➖",
          title: "Remove creators",
          content:
            "Remove creators you no longer want in this shortlist.",
          selector: BRAND_WISHLISTS.removeCreators,
          side: "bottom",
          pointerPadding: 10,
          pointerRadius: 12,
        },
        {
          icon: "🔗",
          title: "Share wishlist",
          content:
            "Generate a share link so teammates can review your shortlist.",
          selector: BRAND_WISHLISTS.share,
          side: "bottom",
          pointerPadding: 10,
          pointerRadius: 12,
        },
        {
          icon: "🔒",
          title: "Make private",
          content:
            "Disable sharing and revoke public access to this list.",
          selector: BRAND_WISHLISTS.makePrivate,
          side: "bottom",
          pointerPadding: 10,
          pointerRadius: 12,
        },
        {
          icon: "📝",
          title: "Rename wishlist",
          content:
            "Quickly rename this list without clicking the title.",
          selector: BRAND_WISHLISTS.rename,
          side: "bottom",
          pointerPadding: 10,
          pointerRadius: 12,
        },
        {
          icon: "🗑️",
          title: "Delete wishlist",
          content:
            "Permanently delete this list and all saved creators in it.",
          selector: BRAND_WISHLISTS.delete,
          side: "bottom",
          pointerPadding: 10,
          pointerRadius: 12,
        },
        {
          icon: "🎬",
          title: "Saved creators",
          content:
            "Open any creator card to preview their profile and start an order.",
          selector: BRAND_WISHLISTS.creators,
          side: "top",
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
    match: (p) => p.startsWith("/brand/settings/profile"),
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
          side: "bottom-left",
          pointerPadding: 10,
          pointerRadius: 12,
        },
        {
          icon: "📤",
          title: "Delivered",
          content:
            "Content you've submitted and is waiting for brand review.",
          selector: CREATOR_ORDERS_TAB.delivered,
          side: "bottom-left",
          pointerPadding: 10,
          pointerRadius: 12,
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
          pointerPadding: 10,
          pointerRadius: 14,
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
        {
          icon: "⚡️",
          title: "Boost your visibility",
          content:
            "Creators with 10+ portfolio pieces get more inbound orders. Use this card to see progress and add more work quickly.",
          selector: '[data-tour="creator-portfolio-boost"]',
          side: "left",
        },
        {
          icon: "🗂️",
          title: "Portfolio cards",
          content:
            "These are the videos brands will browse. Keep your best work at the top and tag each piece clearly.",
          selector: '[data-tour="creator-portfolio-cards"]',
          side: "top",
        },
        {
          icon: "🏷️",
          title: "Edit tags",
          content:
            "Add/edit tags on each video to improve search & discovery. This helps brands find you for the right briefs.",
          selector: '[data-tour="creator-portfolio-edit-tags"]',
          side: "top",
        },
        {
          icon: "💡",
          title: "Tips to get more orders",
          content:
            "Follow these quick tips to increase your chances of getting booked.",
          selector: '[data-tour="creator-portfolio-tips"]',
          side: "left",
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
