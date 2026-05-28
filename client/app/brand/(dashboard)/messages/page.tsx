import { Metadata } from "next";
import { MessagingInterface } from "@/components/messages/messaging-interface";

export const metadata: Metadata = {
  title: "Messages | Brand Dashboard",
  description: "View and manage your brand conversations.",
};

export default function BrandMessagesPage() {
  return <MessagingInterface role="brand" />;
}
