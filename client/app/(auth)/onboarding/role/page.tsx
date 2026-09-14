import { Suspense } from "react";
import type { Metadata } from "next";
import AuthLoading from "@/app/(auth)/loading";
import { RoleChoiceView } from "@/features/auth/components/role-choice-view";

export const metadata: Metadata = { title: "Choose your role" };

export default function OnboardingRolePage() {
  return (
    <Suspense fallback={<AuthLoading />}>
      <RoleChoiceView />
    </Suspense>
  );
}
