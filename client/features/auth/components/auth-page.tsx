import { Suspense } from "react";
import { AuthThemeSwitch } from "./auth-theme-switch";
import { AuthForm } from "./auth-form";
import { DashboardPreview } from "./dashboard-preview";

interface AuthPageProps {
  mode: "login" | "signup";
}

export function AuthPage({ mode }: AuthPageProps) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      <DashboardPreview />
      <Suspense fallback={null}>
        <AuthForm mode={mode} />
      </Suspense>
      <AuthThemeSwitch />
    </div>
  );
}
