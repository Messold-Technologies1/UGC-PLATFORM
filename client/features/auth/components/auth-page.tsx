import { AuthForm } from "./auth-form";
import { DashboardPreview } from "./dashboard-preview";

interface AuthPageProps {
  mode: "login" | "signup";
}

export function AuthPage({ mode }: AuthPageProps) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      <DashboardPreview />
      <AuthForm mode={mode} />
    </div>
  );
}