import { Suspense } from "react";
import { Navbar } from "@/components/navbar/navbar";
import { NavbarFallback } from "@/components/navbar/navbar-fallback";
import { AuthProvider } from "@/providers/auth-provider";

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      <div className="relative min-h-dvh">
        <div className="absolute inset-x-0 top-0 z-50 pt-4">
          <Suspense fallback={<NavbarFallback />}>
            <Navbar className="mb-0" />
          </Suspense>
        </div>
        {children}
      </div>
    </AuthProvider>
  );
}
