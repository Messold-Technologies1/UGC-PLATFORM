"use client";

import { useSearchParams } from "next/navigation";
import { WorkspaceDashboardBackdrop } from "@/components/post-login/workspace-dashboard-backdrop";
import {
  AUTH_CONTINUE_SETUP_ROLE_PARAM,
  parseAuthContinueSetupRole,
} from "./setup-role";

export function AuthContinueBackground() {
  const searchParams = useSearchParams();
  const setupRole = parseAuthContinueSetupRole(
    searchParams.get(AUTH_CONTINUE_SETUP_ROLE_PARAM),
  );

  if (!setupRole) {
    return null;
  }

  return <WorkspaceDashboardBackdrop role={setupRole} />;
}
