import { Suspense } from "react";
import type { Metadata } from "next";
import AuthLoading from "@/app/(auth)/loading";
import { BrandRegisterPage } from "@/features/auth/components/brand-register-page";

export const metadata: Metadata = {
  title: "Brand Registration - UGCull",
  description:
    "Join top D2C brands driving conversions with authentic creator content. Register your brand profile.",
};

export default function RegisterBrandRoute() {
  return (
    <Suspense fallback={<AuthLoading />}>
      <BrandRegisterPage />
    </Suspense>
  );
}
