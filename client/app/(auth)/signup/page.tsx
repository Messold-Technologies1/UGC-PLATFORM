import type { Metadata } from "next";
import { AuthPage } from "@/features/auth";

export const metadata: Metadata = { title: "Sign Up" };

export default function SignupPage() {
  return <AuthPage mode="signup" />;
}