import { Suspense } from "react";
import { Navbar } from "@/components/navbar";
import { NavbarFallback } from "@/components/navbar-fallback";
import { Footer } from "@/components/footer";

export default function MainLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <Suspense fallback={<NavbarFallback />}>
        <Navbar />
      </Suspense>
      <main id="main-content" className="flex-1">
        {children}
      </main>
      <Footer />
    </>
  );
}
