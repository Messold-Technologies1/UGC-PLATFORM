export interface DashboardStatCard {
  label: string;
  value: string | number;
  subLabel: string;
  trend?: { value: string; positive: boolean };
  icon: "clock" | "package" | "refresh" | "wallet";
}

export interface DashboardActiveOrder {
  id: string;
  brandName: string;
  brandInitials: string;
  brandBgClass: string;
  packageName: string;
  status: string;
  statusColor: string;
  deliveryDate: string;
  payout: number;
}

export interface DashboardUpcomingDelivery {
  orderId: string;
  brandName: string;
  packageName: string;
  dueDate: string;
  daysLeft: number;
  urgent: boolean;
}

export interface DashboardMessage {
  brandName: string;
  brandInitials: string;
  brandBgClass: string;
  preview: string;
  time: string;
  unread: number;
}

export interface DashboardTask {
  label: string;
  dueLabel: string;
  done: boolean;
  urgent: boolean;
}

export interface DashboardEarningsPoint {
  label: string;
  value: number;
}

export interface DashboardData {
  creator: {
    name: string;
    displayName: string;
    rating: number;
    reviewCount: number;
    responseRate: number;
    onTimeRate: number;
    isTopCreator: boolean;
    isVerified: boolean;
  };
  stats: DashboardStatCard[];
  activeOrders: DashboardActiveOrder[];
  upcomingDeliveries: DashboardUpcomingDelivery[];
  messages: DashboardMessage[];
  tasks: DashboardTask[];
  earnings: {
    total: number;
    trend: string;
    completedOrders: number;
    pendingPayout: number;
    chartData: DashboardEarningsPoint[];
  };
}

export const MOCK_DASHBOARD_DATA: DashboardData = {
  creator: {
    name: "Riya",
    displayName: "Riya Sharma",
    rating: 4.9,
    reviewCount: 126,
    responseRate: 98,
    onTimeRate: 100,
    isTopCreator: true,
    isVerified: true,
  },
  stats: [
    {
      label: "Pending Requests",
      value: 7,
      subLabel: "2 new today",
      icon: "clock",
    },
    {
      label: "Active Orders",
      value: 5,
      subLabel: "1 started today",
      icon: "package",
    },
    {
      label: "Revisions Pending",
      value: 2,
      subLabel: "1 needs your update",
      icon: "refresh",
    },
    {
      label: "Available Balance",
      value: "₹24,560",
      subLabel: "Ready to withdraw",
      trend: { value: "+12% vs last month", positive: true },
      icon: "wallet",
    },
  ],
  activeOrders: [
    {
      id: "GC12345",
      brandName: "GlowUp Skincare",
      brandInitials: "G",
      brandBgClass: "bg-emerald-500",
      packageName: "UGC Video (60s)",
      status: "Awaiting Shipment",
      statusColor: "bg-sky-500/10 text-sky-600 border-sky-500/20",
      deliveryDate: "12 May 2025",
      payout: 2199,
    },
    {
      id: "GC12344",
      brandName: "Pure Nutrition",
      brandInitials: "PN",
      brandBgClass: "bg-indigo-600",
      packageName: "UGC Video (30s)",
      status: "In Progress",
      statusColor: "bg-blue-500/10 text-blue-600 border-blue-500/20",
      deliveryDate: "14 May 2025",
      payout: 1799,
    },
    {
      id: "GC12343",
      brandName: "Herbloom",
      brandInitials: "H",
      brandBgClass: "bg-green-600",
      packageName: "UGC Video (60s)",
      status: "Delivered",
      statusColor: "bg-purple-500/10 text-purple-500 border-purple-500/20",
      deliveryDate: "10 May 2025",
      payout: 2499,
    },
    {
      id: "GC12342",
      brandName: "FitLife",
      brandInitials: "F",
      brandBgClass: "bg-red-500",
      packageName: "UGC Video (45s)",
      status: "Revision Requested",
      statusColor: "bg-orange-500/10 text-orange-500 border-orange-500/20",
      deliveryDate: "09 May 2025",
      payout: 1699,
    },
    {
      id: "GC12341",
      brandName: "Sleek Beauty",
      brandInitials: "SB",
      brandBgClass: "bg-slate-700",
      packageName: "UGC Video (60s)",
      status: "Completed",
      statusColor: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
      deliveryDate: "05 May 2025",
      payout: 2199,
    },
  ],
  upcomingDeliveries: [
    {
      orderId: "GC12345",
      brandName: "GlowUp Skincare",
      packageName: "UGC Video (60s)",
      dueDate: "12 May 2025",
      daysLeft: 2,
      urgent: true,
    },
    {
      orderId: "GC12344",
      brandName: "Pure Nutrition",
      packageName: "UGC Video (30s)",
      dueDate: "14 May 2025",
      daysLeft: 4,
      urgent: false,
    },
    {
      orderId: "GC12339",
      brandName: "BodyFuel",
      packageName: "UGC Video (60s)",
      dueDate: "17 May 2025",
      daysLeft: 7,
      urgent: false,
    },
  ],
  messages: [
    {
      brandName: "GlowUp Skincare",
      brandInitials: "G",
      brandBgClass: "bg-emerald-500",
      preview: "Hey Riya! Your product is on the way. Here's the tracking...",
      time: "10:30 AM",
      unread: 2,
    },
    {
      brandName: "Pure Nutrition",
      brandInitials: "PN",
      brandBgClass: "bg-indigo-600",
      preview: "Can you share a draft update?",
      time: "Yesterday",
      unread: 0,
    },
    {
      brandName: "Herbloom",
      brandInitials: "H",
      brandBgClass: "bg-green-600",
      preview: "Amazing! Thank you for the quick delivery.",
      time: "Yesterday",
      unread: 0,
    },
    {
      brandName: "FitLife",
      brandInitials: "F",
      brandBgClass: "bg-red-500",
      preview: "Please check the revision notes we left.",
      time: "2 days ago",
      unread: 1,
    },
  ],
  tasks: [
    {
      label: "Review revision notes — FitLife",
      dueLabel: "Due today",
      done: false,
      urgent: true,
    },
    {
      label: "Upload draft — Pure Nutrition",
      dueLabel: "Completed",
      done: true,
      urgent: false,
    },
    {
      label: "Mark product received — Herbloom",
      dueLabel: "Due tomorrow",
      done: false,
      urgent: false,
    },
  ],
  earnings: {
    total: 28760,
    trend: "+18% vs last month",
    completedOrders: 8,
    pendingPayout: 24560,
    chartData: [
      { label: "Week 1", value: 5200 },
      { label: "Week 2", value: 11800 },
      { label: "Week 3", value: 18400 },
      { label: "Week 4", value: 24100 },
      { label: "Week 5", value: 28760 },
    ],
  },
};
