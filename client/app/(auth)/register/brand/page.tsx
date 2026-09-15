import { redirect } from "next/navigation";

/** Old one-shot brand signup URL. Exact `/register/brand` only — brand setup
 * after role choice is `/onboarding/brand`. */
export default function LegacyBrandRegisterRedirect() {
  redirect("/register");
}
