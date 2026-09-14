import { AuthProvider } from "@/providers/auth-provider";

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // The unified auth shell renders its own slim logo bar, so the full site
  // navbar (with "For Creators" / "For Brands") is intentionally not shown here.
  return <AuthProvider>{children}</AuthProvider>;
}
