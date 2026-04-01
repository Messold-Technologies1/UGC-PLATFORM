import { PublicAppProviders } from "@/providers/app-providers";

export default function AuthRoutesLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <PublicAppProviders>{children}</PublicAppProviders>;
}
