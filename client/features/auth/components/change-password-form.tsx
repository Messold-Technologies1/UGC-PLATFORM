"use client";

import { useCallback, useState } from "react";
import { useForm, type UseFormRegisterReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { isAxiosError } from "axios";
import { Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import { useChangePasswordMutation } from "@/features/auth/hooks/use-password-mutations";

const schema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  })
  .refine((data) => data.currentPassword !== data.newPassword, {
    message: "New password must be different from your current password",
    path: ["newPassword"],
  });

type FormData = z.infer<typeof schema>;

export function ChangePasswordForm() {
  const mutation = useChangePasswordMutation();
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const onSubmit = useCallback(
    (data: FormData) => {
      mutation.mutate(
        {
          currentPassword: data.currentPassword,
          newPassword: data.newPassword,
        },
        {
          onSuccess: () => {
            form.reset();
            toast.success("Password updated", {
              description: "Your password has been changed. Other sessions were signed out.",
            });
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
    [form, mutation],
  );

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="max-w-md space-y-4">
      <PasswordInput
        id="current-password"
        label="Current password"
        autoComplete="current-password"
        disabled={mutation.isPending}
        show={showCurrent}
        onToggleShow={() => setShowCurrent((v) => !v)}
        registration={form.register("currentPassword")}
        errorMessage={form.formState.errors.currentPassword?.message}
      />

      <PasswordInput
        id="new-password"
        label="New password"
        autoComplete="new-password"
        disabled={mutation.isPending}
        show={showNew}
        onToggleShow={() => setShowNew((v) => !v)}
        registration={form.register("newPassword")}
        errorMessage={form.formState.errors.newPassword?.message}
      />

      <PasswordInput
        id="confirm-password"
        label="Confirm new password"
        autoComplete="new-password"
        disabled={mutation.isPending}
        show={showConfirm}
        onToggleShow={() => setShowConfirm((v) => !v)}
        registration={form.register("confirmPassword")}
        errorMessage={form.formState.errors.confirmPassword?.message}
      />

      <Button type="submit" disabled={mutation.isPending}>
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
