import { PublicAppProviders } from "@/providers/app-providers";

export default function AdminAuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <PublicAppProviders>{children}</PublicAppProviders>;
}
