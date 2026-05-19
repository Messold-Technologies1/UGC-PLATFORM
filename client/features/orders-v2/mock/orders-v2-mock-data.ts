import type { OrderV2Status } from "../constants";

export interface OrderV2Brand {
  name: string;
  category: string;
  totalOrders: number;
  completedOrders: number;
  rating: number;
}

export interface OrderV2Brief {
  description: string;
  videoType: string;
  keyPoints: string;
  language: string;
  tone: string;
  usageRights: string;
  deliverables: string;
  dueDate: string;
}

export interface OrderV2Earnings {
  basePayout: number;
  addOnsTotal: number;
  addOnsCount: number;
  platformFee: number;
  estPayout: number;
}

export interface OrderV2Attachment {
  name: string;
  size: string;
}

export interface OrderV2TimelineStep {
  label: string;
  description: string;
  status: "completed" | "active" | "pending";
}

export interface OrderV2Summary {
  videoType: string;
  style: string;
  language: string;
  keyPoints: string;
  addOns: string[];
  totalPayout: number;
}

export interface OrderV2Item {
  id: string; // display ID e.g. "GC12345"
  brand: OrderV2Brand;
  packageName: string;
  type: string;
  status: OrderV2Status;
  isNew: boolean;
  payout: number;
  deliveryLabel: string;
  createdAt: string;
  // Detail panel fields
  brief?: OrderV2Brief;
  messageFromBrand?: string;
  messageSentAt?: string;
  earnings?: OrderV2Earnings;
  attachments?: OrderV2Attachment[];
  orderSummary?: OrderV2Summary;
  timeline?: OrderV2TimelineStep[];
}

const buildTimeline = (status: OrderV2Status): OrderV2TimelineStep[] => {
  const steps: OrderV2TimelineStep[] = [
    {
      label: "Order Accepted",
      description: "11 May 2025, 10:20 AM",
      status: "completed",
    },
    {
      label: "Product Shipped",
      description: "Waiting for brand to ship the product",
      status: "pending",
    },
    {
      label: "Product Received",
      description: "Mark the product as received to get started",
      status: "pending",
    },
    {
      label: "In Progress",
      description: "Start creating your content",
      status: "pending",
    },
    {
      label: "Delivered",
      description: "Submit the final content for review",
      status: "pending",
    },
    {
      label: "Completed",
      description: "Get paid after approval",
      status: "pending",
    },
  ];

  const completedCount: Record<OrderV2Status, number> = {
    NEW_REQUEST: 0,
    AWAITING_SHIPMENT: 1,
    IN_PROGRESS: 3,
    REVISION_REQUESTED: 4,
    DELIVERED: 4,
    COMPLETED: 6,
    CANCELLED: 1,
  };

  const count = completedCount[status];
  return steps.map((step, i) => ({
    ...step,
    status:
      i < count ? "completed" : i === count ? "active" : "pending",
  }));
};

export const MOCK_ORDERS_V2: OrderV2Item[] = [
  {
    id: "GC12345",
    brand: {
      name: "GlowUp Skincare",
      category: "Skincare",
      totalOrders: 12,
      completedOrders: 10,
      rating: 4.8,
    },
    packageName: "UGC Video (60s)",
    type: "Product Demo",
    status: "AWAITING_SHIPMENT",
    isNew: true,
    payout: 2199,
    deliveryLabel: "ETA: 12 May 2025",
    createdAt: "2025-05-11T10:20:00Z",
    messageFromBrand:
      "Hi Riya, We're excited to collaborate with you! We're looking for an authentic and engaging UGC video that highlights the benefits of our Vitamin C Serum.\n\nLooking forward to your amazing content!\n— GlowUp Team",
    messageSentAt: "9 May 2025, 11:20 AM",
    orderSummary: {
      videoType: "UGC Video (60s)",
      style: "Natural, Clean, Relatable",
      language: "Hindi",
      keyPoints: "5 key points",
      addOns: ["Script Writing", "Raw Footage"],
      totalPayout: 2199,
    },
    timeline: buildTimeline("AWAITING_SHIPMENT"),
  },
  {
    id: "GC12344",
    brand: {
      name: "Pure Nutrition",
      category: "Health",
      totalOrders: 8,
      completedOrders: 7,
      rating: 4.6,
    },
    packageName: "UGC Video (30s)",
    type: "Testimonial",
    status: "IN_PROGRESS",
    isNew: false,
    payout: 1799,
    deliveryLabel: "Due: 14 May 2025",
    createdAt: "2025-05-10T09:00:00Z",
    orderSummary: {
      videoType: "UGC Video (30s)",
      style: "Energetic, Motivating",
      language: "English",
      keyPoints: "3 key points",
      addOns: ["Script Writing"],
      totalPayout: 1799,
    },
    timeline: buildTimeline("IN_PROGRESS"),
  },
  {
    id: "GC12343",
    brand: {
      name: "Herbloom",
      category: "Wellness",
      totalOrders: 6,
      completedOrders: 5,
      rating: 4.7,
    },
    packageName: "UGC Video (60s)",
    type: "Product Demo",
    status: "DELIVERED",
    isNew: false,
    payout: 2499,
    deliveryLabel: "Delivered on 10 May",
    createdAt: "2025-05-05T11:00:00Z",
    orderSummary: {
      videoType: "UGC Video (60s)",
      style: "Calm, Natural",
      language: "Hindi",
      keyPoints: "4 key points",
      addOns: [],
      totalPayout: 2499,
    },
    timeline: buildTimeline("DELIVERED"),
  },
  {
    id: "GC12342",
    brand: {
      name: "FitLife",
      category: "Fitness",
      totalOrders: 10,
      completedOrders: 8,
      rating: 4.5,
    },
    packageName: "UGC Video (45s)",
    type: "How to Use",
    status: "REVISION_REQUESTED",
    isNew: false,
    payout: 1699,
    deliveryLabel: "Requested on 09 May",
    createdAt: "2025-05-04T14:00:00Z",
    orderSummary: {
      videoType: "UGC Video (45s)",
      style: "Dynamic, Punchy",
      language: "English",
      keyPoints: "3 key points",
      addOns: ["Raw Footage"],
      totalPayout: 1699,
    },
    timeline: buildTimeline("REVISION_REQUESTED"),
  },
  {
    id: "GC12341",
    brand: {
      name: "Sleek Beauty",
      category: "Beauty",
      totalOrders: 15,
      completedOrders: 14,
      rating: 4.9,
    },
    packageName: "UGC Video (60s)",
    type: "Product Demo",
    status: "COMPLETED",
    isNew: false,
    payout: 2199,
    deliveryLabel: "Completed on 05 May",
    createdAt: "2025-04-28T10:00:00Z",
    timeline: buildTimeline("COMPLETED"),
  },
  {
    id: "GC12340",
    brand: {
      name: "BodyFuel",
      category: "Supplements",
      totalOrders: 4,
      completedOrders: 3,
      rating: 4.3,
    },
    packageName: "UGC Video (60s)",
    type: "Testimonial",
    status: "CANCELLED",
    isNew: false,
    payout: 0,
    deliveryLabel: "Cancelled on 02 May",
    createdAt: "2025-04-25T09:00:00Z",
    timeline: buildTimeline("CANCELLED"),
  },
  {
    id: "GC12339",
    brand: {
      name: "QuickBite",
      category: "Food",
      totalOrders: 3,
      completedOrders: 2,
      rating: 4.2,
    },
    packageName: "UGC Video (30s)",
    type: "Unboxing",
    status: "AWAITING_SHIPMENT",
    isNew: false,
    payout: 1299,
    deliveryLabel: "ETA: 16 May 2025",
    createdAt: "2025-05-09T13:00:00Z",
    timeline: buildTimeline("AWAITING_SHIPMENT"),
  },
  {
    id: "GC12338",
    brand: {
      name: "HydraPure",
      category: "Skincare",
      totalOrders: 7,
      completedOrders: 6,
      rating: 4.6,
    },
    packageName: "UGC Video (60s)",
    type: "Review",
    status: "IN_PROGRESS",
    isNew: false,
    payout: 2299,
    deliveryLabel: "Due: 18 May 2025",
    createdAt: "2025-05-08T11:00:00Z",
    timeline: buildTimeline("IN_PROGRESS"),
  },
  {
    id: "GC12346",
    brand: {
      name: "GlowUp Skincare",
      category: "Skincare",
      totalOrders: 12,
      completedOrders: 10,
      rating: 4.8,
    },
    packageName: "UGC Video (60s)",
    type: "Testimonial",
    status: "NEW_REQUEST",
    isNew: true,
    payout: 2499,
    deliveryLabel: "Due: 12 May 2025",
    createdAt: "2025-05-09T08:00:00Z",
    brief: {
      description:
        "Create an engaging 60-second UGC video for GlowUp Vitamin C Serum.",
      videoType: "UGC Testimonial",
      keyPoints: "5 key points",
      language: "Hindi",
      tone: "Natural, Authentic",
      usageRights: "Organic Social + Paid Ads",
      deliverables: "1 UGC Video (60s), 9:16 Aspect Ratio",
      dueDate: "12 May 2025",
    },
    messageFromBrand:
      "Hi Riya,\n\nWe're excited to collaborate with you! We're looking for an authentic and engaging UGC video that highlights the benefits of our Vitamin C Serum.\n\nLooking forward to your amazing content!\n— GlowUp Team",
    messageSentAt: "9 May 2025, 11:20 AM",
    earnings: {
      basePayout: 2199,
      addOnsTotal: 300,
      addOnsCount: 2,
      platformFee: 0,
      estPayout: 2499,
    },
    attachments: [
      { name: "Product Images.zip", size: "2.4 MB" },
      { name: "Brand Guidelines.pdf", size: "1.8 MB" },
    ],
  },
  {
    id: "GC12347",
    brand: {
      name: "Pure Nutrition",
      category: "Health",
      totalOrders: 8,
      completedOrders: 7,
      rating: 4.6,
    },
    packageName: "UGC Video (30s)",
    type: "Testimonial",
    status: "NEW_REQUEST",
    isNew: true,
    payout: 1799,
    deliveryLabel: "Due: 13 May 2025",
    createdAt: "2025-05-09T09:00:00Z",
    brief: {
      description:
        "Create a 30-second energetic UGC video showcasing our new Whey Protein range.",
      videoType: "UGC Testimonial",
      keyPoints: "3 key points",
      language: "English",
      tone: "Energetic, Motivating",
      usageRights: "Organic Social",
      deliverables: "1 UGC Video (30s), 9:16 Aspect Ratio",
      dueDate: "13 May 2025",
    },
    messageFromBrand:
      "Hey Riya,\n\nWe love your fitness content! We'd love for you to showcase our new Whey Protein range in an authentic way.\n\nCheers,\n— Pure Nutrition Team",
    messageSentAt: "9 May 2025, 09:45 AM",
    earnings: {
      basePayout: 1599,
      addOnsTotal: 200,
      addOnsCount: 1,
      platformFee: 0,
      estPayout: 1799,
    },
    attachments: [{ name: "Product Brief.pdf", size: "1.2 MB" }],
  },
  {
    id: "GC12337",
    brand: {
      name: "Luxeology",
      category: "Luxury",
      totalOrders: 5,
      completedOrders: 5,
      rating: 5.0,
    },
    packageName: "UGC Video (60s)",
    type: "Lifestyle",
    status: "COMPLETED",
    isNew: false,
    payout: 1999,
    deliveryLabel: "Completed on 28 Apr",
    createdAt: "2025-04-20T10:00:00Z",
    timeline: buildTimeline("COMPLETED"),
  },
  {
    id: "GC12336",
    brand: {
      name: "NaturalMe",
      category: "Organic",
      totalOrders: 9,
      completedOrders: 8,
      rating: 4.7,
    },
    packageName: "UGC Video (60s)",
    type: "Product Demo",
    status: "COMPLETED",
    isNew: false,
    payout: 2099,
    deliveryLabel: "Completed on 25 Apr",
    createdAt: "2025-04-18T11:00:00Z",
    timeline: buildTimeline("COMPLETED"),
  },
  {
    id: "GC12335",
    brand: {
      name: "BeautyBliss",
      category: "Beauty",
      totalOrders: 11,
      completedOrders: 10,
      rating: 4.8,
    },
    packageName: "UGC Video (45s)",
    type: "Testimonial",
    status: "COMPLETED",
    isNew: false,
    payout: 1899,
    deliveryLabel: "Completed on 20 Apr",
    createdAt: "2025-04-13T09:00:00Z",
    timeline: buildTimeline("COMPLETED"),
  },
  {
    id: "GC12334",
    brand: {
      name: "FreshBrew",
      category: "Food & Beverage",
      totalOrders: 4,
      completedOrders: 3,
      rating: 4.4,
    },
    packageName: "UGC Video (30s)",
    type: "Unboxing",
    status: "IN_PROGRESS",
    isNew: false,
    payout: 1599,
    deliveryLabel: "Due: 20 May 2025",
    createdAt: "2025-05-12T10:00:00Z",
    timeline: buildTimeline("IN_PROGRESS"),
  },
  {
    id: "GC12333",
    brand: {
      name: "HealthFirst",
      category: "Healthcare",
      totalOrders: 6,
      completedOrders: 5,
      rating: 4.5,
    },
    packageName: "UGC Video (60s)",
    type: "Review",
    status: "COMPLETED",
    isNew: false,
    payout: 2399,
    deliveryLabel: "Completed on 15 Apr",
    createdAt: "2025-04-08T10:00:00Z",
    timeline: buildTimeline("COMPLETED"),
  },
];
