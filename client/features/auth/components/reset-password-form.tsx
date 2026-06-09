"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { useForm, type UseFormRegisterReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { isAxiosError } from "axios";
import { Eye, EyeOff } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import { useResetPasswordMutation } from "@/features/auth/hooks/use-password-mutations";

const schema = z
  .object({
    newPassword: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type FormData = z.infer<typeof schema>;

type ResetPasswordFormProps = {
  token: string;
};

export function ResetPasswordForm({ token }: ResetPasswordFormProps) {
  const router = useRouter();
  const mutation = useResetPasswordMutation();
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { newPassword: "", confirmPassword: "" },
  });

  const onSubmit = useCallback(
    (data: FormData) => {
      mutation.mutate(
        { token, newPassword: data.newPassword },
        {
          onSuccess: () => {
            toast.success("Password updated", {
              description: "You can now log in with your new password.",
            });
            router.replace("/login");
          },
          onError: (error) => {
            if (isAxiosError(error) && error.response) {
              toast.error(error.response.data.message || "An error occurred");
            } else {
              toast.error("An unexpected error occurred");
            }
          },
        },
      );
    },
    [mutation, router, token],
  );

  if (!token.trim()) {
    return (
      <div className="flex min-h-full w-full flex-col items-center justify-center px-6 py-12 lg:px-16">
        <div className="w-full max-w-sm space-y-4 text-center">
          <h1 className="text-2xl font-bold tracking-tight">Invalid reset link</h1>
          <p className="text-sm text-muted-foreground">
            This password reset link is missing or invalid. Request a new one from
            the login page.
          </p>
          <Button asChild className="w-full">
            <Link href="/forgot-password">Request new link</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-full w-full flex-col items-center justify-center px-6 py-12 lg:px-16">
      <div className="w-full max-w-sm">
        <h1 className="text-3xl font-bold tracking-tight">Set a new password</h1>
        <p className="mt-2 text-muted-foreground">
          Choose a new password for your account.
        </p>

        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="mt-8 space-y-4"
        >
          <PasswordInput
            id="reset-new-password"
            label="New password"
            autoComplete="new-password"
            disabled={mutation.isPending}
            show={showNew}
            onToggleShow={() => setShowNew((v) => !v)}
            registration={form.register("newPassword")}
            errorMessage={form.formState.errors.newPassword?.message}
          />

          <PasswordInput
            id="reset-confirm-password"
            label="Confirm password"
            autoComplete="new-password"
            disabled={mutation.isPending}
            show={showConfirm}
            onToggleShow={() => setShowConfirm((v) => !v)}
            registration={form.register("confirmPassword")}
            errorMessage={form.formState.errors.confirmPassword?.message}
          />

          <Button
            type="submit"
            disabled={mutation.isPending}
            className="h-11 w-full"
            size="lg"
          >
            {mutation.isPending ? (
              <>
                <Spinner className="size-4" aria-hidden />
                Updating…
              </>
            ) : (
              "Update password"
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}

type PasswordInputProps = {
  id: string;
  label: string;
  autoComplete: string;
  disabled: boolean;
  show: boolean;
  onToggleShow: () => void;
  registration: UseFormRegisterReturn;
  errorMessage?: string;
};

function PasswordInput({
  id,
  label,
  autoComplete,
  disabled,
  show,
  onToggleShow,
  registration,
  errorMessage,
}: PasswordInputProps) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Input
          id={id}
          type={show ? "text" : "password"}
          autoComplete={autoComplete}
          disabled={disabled}
          className="h-10 pr-10"
          {...registration}
        />
        <button
          type="button"
          onClick={onToggleShow}
          className={cn(
            "absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground",
            disabled && "pointer-events-none opacity-50",
          )}
          aria-label={show ? "Hide password" : "Show password"}
        >
          {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      </div>
      {errorMessage && (
        <p className="text-sm text-destructive">{errorMessage}</p>
      )}
    </div>
  );
}
