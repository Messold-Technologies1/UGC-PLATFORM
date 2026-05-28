import { type LucideIcon } from "lucide-react";

export type ConversationStatus = "Completed" | "In Progress" | "Delivered" | "Revision Requested" | "Awaiting Shipment" | "Cancelled";

export interface Conversation {
  id: string;
  name: string;
  avatarText: string;
  avatarColor: string; // Tailwind class
  status: ConversationStatus;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  isOnline?: boolean;
}

export type MessageSender = "me" | "them" | "system";

export interface Message {
  id: string;
  sender: MessageSender;
  text?: string;
  time: string;
  dateHeader?: string; // If this message starts a new date group
  isRead?: boolean;
  type: "text" | "order_status" | "shipping_details";
  metadata?: any;
}

export const mockConversations: Conversation[] = [
  {
    id: "1",
    name: "GlowUp Skincare",
    avatarText: "g",
    avatarColor: "bg-emerald-500",
    status: "Completed",
    lastMessage: "You: Great! Thank you so much 🙌",
    lastMessageTime: "12 May",
    unreadCount: 0,
  },
  {
    id: "2",
    name: "Pure Nutrition",
    avatarText: "PN",
    avatarColor: "bg-slate-800",
    status: "In Progress",
    lastMessage: "Did you receive the product?",
    lastMessageTime: "10:15 AM",
    unreadCount: 1,
  },
  {
    id: "3",
    name: "Herbloom",
    avatarText: "🌿",
    avatarColor: "bg-green-100 text-green-700",
    status: "Delivered",
    lastMessage: "Thanks! Please share the tracking...",
    lastMessageTime: "Yesterday",
    unreadCount: 1,
  },
  {
    id: "4",
    name: "FitLife",
    avatarText: "F",
    avatarColor: "bg-orange-500",
    status: "Revision Requested",
    lastMessage: "We've requested a revision. Please...",
    lastMessageTime: "Yesterday",
    unreadCount: 1,
  },
  {
    id: "5",
    name: "BodyFuel",
    avatarText: "B",
    avatarColor: "bg-orange-400",
    status: "Awaiting Shipment",
    lastMessage: "Thank you! The video is live now.",
    lastMessageTime: "2 May",
    unreadCount: 0,
  },
  {
    id: "6",
    name: "QuickBite",
    avatarText: "Q",
    avatarColor: "bg-pink-500",
    status: "Cancelled",
    lastMessage: "Order has been cancelled.",
    lastMessageTime: "1 May",
    unreadCount: 0,
  },
  {
    id: "7",
    name: "HydraPure",
    avatarText: "H",
    avatarColor: "bg-blue-500",
    status: "Completed",
    lastMessage: "You: Sure, happy to help!",
    lastMessageTime: "30 Apr",
    unreadCount: 0,
  },
  {
    id: "8",
    name: "Luxeology",
    avatarText: "L",
    avatarColor: "bg-purple-500",
    status: "Completed",
    lastMessage: "Thanks again!",
    lastMessageTime: "28 Apr",
    unreadCount: 0,
  },
];

export const mockMessages: Message[] = [
  {
    id: "sys-1",
    sender: "system",
    type: "order_status",
    time: "",
    metadata: {
      title: "This order has been completed.",
      description: "Messaging is now closed on 12 May 2025.",
      icon: "check-circle",
    }
  },
  {
    id: "m-1",
    sender: "them",
    type: "text",
    text: "Hi Riya! We've shipped the product. Please confirm once you receive it.",
    time: "11:20 AM",
    dateHeader: "9 May 2025"
  },
  {
    id: "m-2",
    sender: "me",
    type: "text",
    text: "Thanks! Please share the tracking details.",
    time: "11:22 AM",
    isRead: true
  },
  {
    id: "m-3",
    sender: "them",
    type: "text",
    text: "Sure, here you go.",
    time: "11:25 AM"
  },
  {
    id: "m-4",
    sender: "them",
    type: "shipping_details",
    time: "11:25 AM",
    metadata: {
      trackingId: "AWB123456789IN",
      courier: "Delhivery"
    }
  },
  {
    id: "m-5",
    sender: "me",
    type: "text",
    text: "Got it! Will keep you posted once I receive it.",
    time: "11:27 AM",
    isRead: true
  },
  {
    id: "m-6",
    sender: "them",
    type: "text",
    text: "Great! Let us know if you need any help 🙂",
    time: "10:15 AM",
    dateHeader: "12 May 2025"
  },
];
