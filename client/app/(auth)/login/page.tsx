import type { Metadata } from "next";
import { AuthPage } from "@/features/auth";

export const metadata: Metadata = { title: "Log In" };

export default function LoginPage() {
  return <AuthPage mode="login" />;
}