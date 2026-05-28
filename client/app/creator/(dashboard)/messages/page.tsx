import { Metadata } from "next";
import { MessagingInterface } from "@/components/messages/messaging-interface";

export const metadata: Metadata = {
  title: "Messages | Creator Dashboard",
  description: "View and manage your creator conversations.",
};

export default function CreatorMessagesPage() {
  return <MessagingInterface role="creator" />;
}
