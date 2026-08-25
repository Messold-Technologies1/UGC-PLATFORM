import { Suspense } from "react";
import { Navbar } from "@/components/navbar/navbar";
import { NavbarFallback } from "@/components/navbar/navbar-fallback";
import { AuthProvider } from "@/providers/auth-provider";

export default function CreatorRegisterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      <Suspense fallback={<NavbarFallback />}>
        <Navbar />
      </Suspense>
      {children}
    </AuthProvider>
  );
}
