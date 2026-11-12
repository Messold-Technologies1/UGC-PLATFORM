import type { Metadata } from "next";

/**
 * The wishlist pages are client components and cannot export metadata, so the
 * title lives here. It covers the list and a single wishlist alike — the id in
 * the URL is not a name worth putting in a title.
 */
export const metadata: Metadata = {
  title: "Wishlists",
  description: "Creators saved to your brand's wishlists on Go Collab.",
};

export default function BrandWishlistsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
