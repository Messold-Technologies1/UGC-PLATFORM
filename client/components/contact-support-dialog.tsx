"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import api from "@/lib/api";
import { ENDPOINTS } from "@/lib/endpoints";
import { useAuth } from "@/providers/auth-provider";

const supportSchema = z.object({
  name: z.string().trim().min(1, { message: "Full name is required" }),
  email: z.email({ message: "Enter a valid email address" }),
  subject: z.string().trim().min(1, { message: "Subject is required" }),
  message: z
    .string()
    .trim()
    .min(10, { message: "Message must be at least 10 characters long" }),
});

type SupportFormValues = z.infer<typeof supportSchema>;

type ContactSupportDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Prefills the subject line, e.g. the screen the request came from. */
  defaultSubject?: string;
};

/**
 * Support request modal. Submits to `POST /api/contact-us`, which forwards the
 * request to the support Slack channel (see server/src/contact-us).
 */
export function ContactSupportDialog({
  open,
  onOpenChange,
  defaultSubject = "",
}: ContactSupportDialogProps) {
  const { user } = useAuth();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<SupportFormValues>({
    resolver: zodResolver(supportSchema),
    defaultValues: {
      name: "",
      email: "",
      subject: defaultSubject,
      message: "",
    },
  });

  // The signed-in user is only known once /me resolves, so seed the identity
  // fields whenever the modal opens rather than at mount.
  useEffect(() => {
    if (!open) return;
    reset({
      name: user?.name ?? "",
      email: user?.email ?? "",
      subject: defaultSubject,
      message: "",
    });
  }, [open, user?.name, user?.email, defaultSubject, reset]);

  const onSubmit = async (values: SupportFormValues) => {
    try {
      await api.post(ENDPOINTS.CONTACT_US, {
        ...values,
        role: user?.primaryRole?.toLowerCase() ?? "guest",
      });
      toast.success("Message sent. Our support team will get back to you.");
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to submit support request:", error);
      toast.error("Could not send your message. Please try again.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Contact support</DialogTitle>
          <DialogDescription>
            Tell us what you need help with and we&apos;ll get back to you.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="support-name">Full name</Label>
            <Input
              id="support-name"
              placeholder="Your name"
              {...register("name")}
            />
            {errors.name ? (
              <p className="text-xs text-destructive">{errors.name.message}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="support-email">Email</Label>
            <Input
              id="support-email"
              type="email"
              placeholder="you@example.com"
              {...register("email")}
            />
            {errors.email ? (
              <p className="text-xs text-destructive">{errors.email.message}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="support-subject">Subject</Label>
            <Input
              id="support-subject"
              placeholder="What is this about?"
              {...register("subject")}
            />
            {errors.subject ? (
              <p className="text-xs text-destructive">
                {errors.subject.message}
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="support-message">Message</Label>
            <Textarea
              id="support-message"
              rows={5}
              placeholder="Describe the issue in a few lines…"
              {...register("message")}
            />
            {errors.message ? (
              <p className="text-xs text-destructive">
                {errors.message.message}
              </p>
            ) : null}
          </div>

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? <Spinner /> : null}
            {isSubmitting ? "Sending…" : "Submit"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

type ContactSupportButtonProps = {
  /** Rendered inside the trigger button. */
  children: ReactNode;
  className?: string;
  variant?: React.ComponentProps<typeof Button>["variant"];
  defaultSubject?: string;
};

/** Trigger button that owns its own {@link ContactSupportDialog} state. */
export function ContactSupportButton({
  children,
  className,
  variant = "outline",
  defaultSubject,
}: ContactSupportButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        type="button"
        variant={variant}
        className={className}
        onClick={() => setOpen(true)}
      >
        {children}
      </Button>
      <ContactSupportDialog
        open={open}
        onOpenChange={setOpen}
        defaultSubject={defaultSubject}
      />
    </>
  );
}
