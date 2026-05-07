import { Suspense } from "react";
import { Navbar } from "@/components/navbar/navbar";
import { NavbarFallback } from "@/components/navbar/navbar-fallback";
import { Footer } from "@/components/footer";
import { AuthenticatedAppProviders } from "@/providers/app-providers";

export default function MainLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <AuthenticatedAppProviders>
      <Suspense fallback={<NavbarFallback />}>
        <Navbar />
      </Suspense>
      <main id="main-content" className="flex-1">
        {children}
      </main>
      <Footer />
    </AuthenticatedAppProviders>
  );
}
