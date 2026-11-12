import type { Metadata } from "next";

/**
 * The one wishlist route that is genuinely public, so this is the only one
 * whose own title and description reach a link preview — the others redirect
 * to sign-in and unfurl as that page.
 */
export const metadata: Metadata = {
  title: "Shared creator wishlist",
  description: "A shortlist of creators shared with you on Go Collab.",
};

export default function SharedWishlistLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
