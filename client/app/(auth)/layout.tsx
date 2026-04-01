import { PublicAppProviders } from "@/providers/app-providers";

export default function AuthGroupLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <PublicAppProviders>{children}</PublicAppProviders>;
}
