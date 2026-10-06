import { Metadata } from "next";
import { MessagingInterface } from "@/components/messages/messaging-interface";

export const metadata: Metadata = {
  title: "Messages | Agency Dashboard",
  description: "View and manage your agency conversations.",
};

export default function AgencyMessagesPage() {
  return <MessagingInterface role="brand" />;
}
