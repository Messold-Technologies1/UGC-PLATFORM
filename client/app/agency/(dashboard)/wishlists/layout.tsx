import type { Metadata } from "next";

/** Client components below, so the title lives here. */
export const metadata: Metadata = {
  title: "Wishlists",
  description: "Creators saved to your agency's wishlists on Go Collab.",
};

export default function AgencyWishlistsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
