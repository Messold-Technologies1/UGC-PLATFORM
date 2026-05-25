import { Suspense } from "react";
import type { Metadata } from "next";
import AuthLoading from "@/app/(auth)/loading";
import { CreatorRegisterPage } from "@/features/auth/components";

export const metadata: Metadata = { title: "Register as Creator | UGCull" };

export default function CreatorRegister() {
  return (
    <Suspense fallback={<AuthLoading />}>
      <CreatorRegisterPage />
    </Suspense>
  );
}
