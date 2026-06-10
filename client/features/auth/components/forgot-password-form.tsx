"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { isAxiosError } from "axios";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { useForgotPasswordMutation } from "@/features/auth/hooks/use-password-mutations";

const schema = z.object({
  email: z
    .email({ error: "Enter a valid email address" })
    .min(1, "Email is required"),
});

type FormData = z.infer<typeof schema>;

export function ForgotPasswordForm() {
  const mutation = useForgotPasswordMutation();
  const [submitted, setSubmitted] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { email: "" },
  });

  const onSubmit = useCallback(
    (data: FormData) => {
      mutation.mutate(data.email, {
        onSuccess: () => {
          setSubmitted(true);
          toast.success("Check your email", {
            description:
              "If an account exists for that address, we sent reset instructions.",
          });
        },
        onError: (error) => {
          if (isAxiosError(error) && error.response) {
            toast.error(error.response.data.message || "An error occurred");
          } else {
            toast.error("An unexpected error occurred");
          }
        },
      });
    },
    [mutation],
  );

  return (
    <div className="flex min-h-full w-full flex-col items-center justify-center px-6 py-12 lg:px-16">
      <div className="w-full max-w-sm">
        <h1 className="text-3xl font-bold tracking-tight">Forgot password</h1>
        <p className="mt-2 text-muted-foreground">
          Enter your email and we&apos;ll send you a link to reset your password.
        </p>

        {submitted ? (
          <div className="mt-8 space-y-4 rounded-lg border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
            <p>
              If an account exists for that email, we sent reset instructions.
              The link expires in one hour.
            </p>
            <Button asChild variant="outline" className="w-full">
              <Link href="/login">Back to log in</Link>
            </Button>
          </div>
        ) : (
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="mt-8 space-y-4"
          >
            <div className="space-y-1.5">
              <Label htmlFor="forgot-email">Email</Label>
              <Input
                id="forgot-email"
                type="email"
                placeholder="you@company.com"
                autoComplete="email"
                disabled={mutation.isPending}
                className="h-10"
                {...form.register("email")}
              />
              {form.formState.errors.email && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.email.message}
                </p>
              )}
            </div>

            <Button
              type="submit"
              disabled={mutation.isPending}
              className="h-11 w-full"
              size="lg"
            >
              {mutation.isPending ? (
                <>
                  <Spinner className="size-4" aria-hidden />
                  Sending…
                </>
              ) : (
                "Send reset link"
              )}
            </Button>

            <p className="text-center text-sm text-muted-foreground">
              <Link href="/login" className="underline hover:text-foreground">
                Back to log in
              </Link>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
