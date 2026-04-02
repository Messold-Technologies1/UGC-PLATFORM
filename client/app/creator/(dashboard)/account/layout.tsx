import type { Metadata } from "next";

export const metadata: Metadata = { title: "Profile" };

export default function CreatorAccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
