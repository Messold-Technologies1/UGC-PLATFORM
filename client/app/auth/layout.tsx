import { AppProviders } from "@/providers/app-providers";

export default function AuthRoutesLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <AppProviders>{children}</AppProviders>;
}
