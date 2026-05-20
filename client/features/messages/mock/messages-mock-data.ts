export type MessageConversationStatus =
  | "IN_PROGRESS"
  | "AWAITING_SHIPMENT"
  | "REVISION_REQUESTED"
  | "DELIVERED"
  | "COMPLETED"
  | "CANCELLED";

export const MSG_STATUS_LABELS: Record<MessageConversationStatus, string> = {
  IN_PROGRESS: "In Progress",
  AWAITING_SHIPMENT: "Awaiting Shipment",
  REVISION_REQUESTED: "Revision Requested",
  DELIVERED: "Delivered",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

export const MSG_STATUS_COLORS: Record<MessageConversationStatus, string> = {
  IN_PROGRESS: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  AWAITING_SHIPMENT: "bg-sky-500/10 text-sky-600 border-sky-500/20",
  REVISION_REQUESTED: "bg-orange-500/10 text-orange-500 border-orange-500/20",
  DELIVERED: "bg-purple-500/10 text-purple-500 border-purple-500/20",
  COMPLETED: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  CANCELLED: "bg-red-500/10 text-red-500 border-red-500/20",
};

export interface ChatMessage {
  id: string;
  text: string;
  senderId: "creator" | "brand";
  createdAt: string;
  isTracking?: boolean;
  trackingData?: { courier: string; trackingId: string; status: string };
}

export interface MessageConversation {
  id: string;
  orderId: string;
  brandName: string;
  brandInitials: string;
  brandBgClass: string;
  brandCategory: string;
  packageName: string;
  status: MessageConversationStatus;
  isChatLocked: boolean;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  messages: ChatMessage[];
}

export const MOCK_CONVERSATIONS: MessageConversation[] = [
  {
    id: "conv-1",
    orderId: "GC12345",
    brandName: "GlowUp Skincare",
    brandInitials: "G",
    brandBgClass: "bg-emerald-500",
    brandCategory: "Skincare",
    packageName: "UGC Video (60s)",
    status: "COMPLETED",
    isChatLocked: true,
    lastMessage: "Hey Riya! Your product is on the way. Here's your tracking...",
    lastMessageTime: "10:30 AM",
    unreadCount: 2,
    messages: [
      {
        id: "m1",
        text: "Hi Riya! We're really excited to work with you on this project.",
        senderId: "brand",
        createdAt: "2025-05-01T09:00:00Z",
      },
      {
        id: "m2",
        text: "Thank you! I'm equally excited. I'll review the brief and get started soon.",
        senderId: "creator",
        createdAt: "2025-05-01T09:15:00Z",
      },
      {
        id: "m3",
        text: "Great! We've shipped the product. Here are the tracking details:",
        senderId: "brand",
        createdAt: "2025-05-02T11:00:00Z",
        isTracking: true,
        trackingData: {
          courier: "BlueDart",
          trackingId: "BD123456789IN",
          status: "In Transit",
        },
      },
      {
        id: "m4",
        text: "Got it! I'll mark it as received once it arrives.",
        senderId: "creator",
        createdAt: "2025-05-02T11:30:00Z",
      },
      {
        id: "m5",
        text: "The package arrived! Starting to create the content now 🎬",
        senderId: "creator",
        createdAt: "2025-05-04T10:00:00Z",
      },
      {
        id: "m6",
        text: "Amazing work Riya! We've approved the delivery. Payment will be processed soon.",
        senderId: "brand",
        createdAt: "2025-05-10T14:00:00Z",
      },
    ],
  },
  {
    id: "conv-2",
    orderId: "GC12344",
    brandName: "Pure Nutrition",
    brandInitials: "PN",
    brandBgClass: "bg-indigo-600",
    brandCategory: "Health",
    packageName: "UGC Video (30s)",
    status: "IN_PROGRESS",
    isChatLocked: false,
    lastMessage: "Can you share a draft update?",
    lastMessageTime: "Yesterday",
    unreadCount: 0,
    messages: [
      {
        id: "m1",
        text: "Hey Riya! Looking forward to working with you.",
        senderId: "brand",
        createdAt: "2025-05-08T09:00:00Z",
      },
      {
        id: "m2",
        text: "Can you share a draft update? We're eager to see the progress.",
        senderId: "brand",
        createdAt: "2025-05-10T10:00:00Z",
      },
    ],
  },
  {
    id: "conv-3",
    orderId: "GC12343",
    brandName: "Herbloom",
    brandInitials: "H",
    brandBgClass: "bg-green-600",
    brandCategory: "Wellness",
    packageName: "UGC Video (60s)",
    status: "DELIVERED",
    isChatLocked: false,
    lastMessage: "Amazing! Thank you for the quick delivery.",
    lastMessageTime: "Yesterday",
    unreadCount: 0,
    messages: [
      {
        id: "m1",
        text: "Amazing! Thank you for the quick delivery. The video looks great!",
        senderId: "brand",
        createdAt: "2025-05-10T14:00:00Z",
      },
    ],
  },
  {
    id: "conv-4",
    orderId: "GC12342",
    brandName: "FitLife",
    brandInitials: "F",
    brandBgClass: "bg-red-500",
    brandCategory: "Fitness",
    packageName: "UGC Video (45s)",
    status: "REVISION_REQUESTED",
    isChatLocked: false,
    lastMessage: "Please check the revision notes we left.",
    lastMessageTime: "2 days ago",
    unreadCount: 1,
    messages: [
      {
        id: "m1",
        text: "Hi Riya, we've reviewed your delivery and left some revision notes. Please check them.",
        senderId: "brand",
        createdAt: "2025-05-09T14:00:00Z",
      },
    ],
  },
  {
    id: "conv-5",
    orderId: "GC12339",
    brandName: "QuickBite",
    brandInitials: "Q",
    brandBgClass: "bg-orange-600",
    brandCategory: "Food",
    packageName: "UGC Video (30s)",
    status: "AWAITING_SHIPMENT",
    isChatLocked: false,
    lastMessage: "We'll ship the product by Friday.",
    lastMessageTime: "3 days ago",
    unreadCount: 0,
    messages: [
      {
        id: "m1",
        text: "Hi! We'll ship the product by Friday. Please keep an eye out for it.",
        senderId: "brand",
        createdAt: "2025-05-07T10:00:00Z",
      },
    ],
  },
  {
    id: "conv-6",
    orderId: "GC12341",
    brandName: "Sleek Beauty",
    brandInitials: "SB",
    brandBgClass: "bg-slate-700",
    brandCategory: "Beauty",
    packageName: "UGC Video (60s)",
    status: "COMPLETED",
    isChatLocked: true,
    lastMessage: "Great collaboration! Looking forward to working again.",
    lastMessageTime: "1 week ago",
    unreadCount: 0,
    messages: [
      {
        id: "m1",
        text: "Great collaboration Riya! The content was exactly what we needed. Looking forward to working again!",
        senderId: "brand",
        createdAt: "2025-05-05T16:00:00Z",
      },
    ],
  },
  {
    id: "conv-7",
    orderId: "GC12338",
    brandName: "HydraPure",
    brandInitials: "HP",
    brandBgClass: "bg-teal-500",
    brandCategory: "Skincare",
    packageName: "UGC Video (60s)",
    status: "IN_PROGRESS",
    isChatLocked: false,
    lastMessage: "Please confirm once you receive the parcel.",
    lastMessageTime: "4 days ago",
    unreadCount: 0,
    messages: [
      {
        id: "m1",
        text: "Hi Riya! Please confirm once you receive the parcel.",
        senderId: "brand",
        createdAt: "2025-05-06T11:00:00Z",
      },
    ],
  },
  {
    id: "conv-8",
    orderId: "GC12337",
    brandName: "Luxeology",
    brandInitials: "L",
    brandBgClass: "bg-violet-600",
    brandCategory: "Luxury",
    packageName: "UGC Video (60s)",
    status: "COMPLETED",
    isChatLocked: true,
    lastMessage: "Stellar work! Payment processed.",
    lastMessageTime: "2 weeks ago",
    unreadCount: 0,
    messages: [
      {
        id: "m1",
        text: "Stellar work Riya! Payment has been processed. Thank you!",
        senderId: "brand",
        createdAt: "2025-04-28T15:00:00Z",
      },
    ],
  },
];
