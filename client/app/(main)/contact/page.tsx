"use client";

import React, { useState } from "react";
import { MessageSquare, LifeBuoy, Handshake } from "lucide-react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import api from "@/lib/api";
import { ENDPOINTS } from "@/lib/endpoints";

const contactSchema = z.object({
  name: z.string().min(1, { message: "Full name is required" }),
  email: z.email({ message: "Invalid email address" }),
  role: z
    .string()
    .regex(/^(brand|creator|agency)$/i, {
      message: "Role must be Brand, Creator, or Agency",
    }),
  subject: z.string().min(1, { message: "Subject is required" }),
  message: z
    .string()
    .min(10, { message: "Message must be at least 10 characters long" }),
});

type ContactFormValues = z.infer<typeof contactSchema>;

export default function ContactPage() {
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<ContactFormValues>({
    resolver: zodResolver(contactSchema),
  });

  const onSubmit = async (data: ContactFormValues) => {
    setIsSubmitting(true);
    setErrorMsg("");
    setSubmitted(false);

    try {
      await api.post(ENDPOINTS.CONTACT_US, data);
      setSubmitted(true);
      reset();
    } catch (error) {
      console.error("Error submitting contact form:", error);
      setErrorMsg("Failed to send your message. Please try again later.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-background relative overflow-x-hidden">
      <section className="bg-grain relative overflow-hidden py-[90px] pb-[70px]">
        <div className="absolute top-[-100px] right-[-60px] h-[320px] w-[320px] animate-float rounded-full bg-sky/20 blur-[60px]"></div>
        <div className="mx-auto max-w-[700px] px-6 text-center relative">
          <div className="text-muted-foreground mb-5 text-sm font-semibold tracking-wider uppercase">
            ✦ Contact us
          </div>
          <h1 className="font-heading mb-5 text-4xl md:text-5xl font-bold tracking-tight">
            We're here to help.
          </h1>
          <p className="mx-auto mb-6 max-w-[560px] text-lg text-foreground/80">
            Whether you're a brand looking to collaborate, a creator who needs
            support, or someone interested in partnering with us, we'd love to
            hear from you.
          </p>
          <span className="inline-flex items-center gap-2 rounded-full border-2 border-foreground bg-lime px-4 py-2 text-[12.5px] font-semibold text-lime-foreground shadow-sticker">
            <span className="h-[7px] w-[7px] rounded-full bg-[#178a3a]"></span>
            Average response time: within 1 business day
          </span>
        </div>
      </section>
      <section className="bg-secondary/60 py-20">
        <div className="mx-auto max-w-[1080px] px-6">
          <div className="mb-11 text-center">
            <div className="text-muted-foreground mb-3.5 text-sm font-semibold tracking-wider uppercase">
              ✦ How can we help
            </div>
            <h2 className="font-heading text-3xl font-bold">
              Choose what you need help with
            </h2>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            <div className="flex flex-col rounded-2xl border-2 border-foreground bg-card p-7 shadow-hard">
              <div className="mb-4.5 flex h-11 w-11 items-center justify-center rounded-lg border-2 border-foreground bg-sky">
                <MessageSquare className="h-5 w-5 text-foreground" />
              </div>
              <h4 className="font-heading mb-2 text-xl font-bold">
                Brand Enquiries
              </h4>
              <p className="mb-4 text-sm text-muted-foreground">
                Looking to launch a UGC campaign or have questions before
                placing an order?
              </p>
              <ul className="mb-5.5 grid gap-2 text-sm text-foreground/80">
                <li>● Campaign planning</li>
                <li>● Creator recommendations</li>
                <li>● Pricing &amp; packages</li>
                <li>● Enterprise partnerships</li>
              </ul>
              <a
                href="mailto:hello@messold.com"
                className="mt-auto block rounded-full border-2 border-foreground bg-foreground px-5 py-3 text-center text-sm font-semibold text-background shadow-hard transition-all hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none"
              >
                Contact Sales
              </a>
            </div>
            <div className="flex flex-col rounded-2xl border-2 border-foreground bg-card p-7 shadow-hard">
              <div className="mb-4.5 flex h-11 w-11 items-center justify-center rounded-lg border-2 border-foreground bg-lime">
                <LifeBuoy className="h-5 w-5 text-foreground" />
              </div>
              <h4 className="font-heading mb-2 text-xl font-bold">
                Creator Support
              </h4>
              <p className="mb-4 text-sm text-muted-foreground">
                Need help setting up your profile or managing collaborations?
              </p>
              <ul className="mb-5.5 grid gap-2 text-sm text-foreground/80">
                <li>● Profile verification</li>
                <li>● Portfolio setup</li>
                <li>● Payments</li>
                <li>● Orders &amp; revisions</li>
              </ul>
              <a
                href="mailto:support@gocollab.io"
                className="mt-auto block rounded-full border-2 border-foreground bg-foreground px-5 py-3 text-center text-sm font-semibold text-background shadow-hard transition-all hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none"
              >
                Contact Creator Support
              </a>
            </div>
            <div className="flex flex-col rounded-2xl border-2 border-foreground bg-card p-7 shadow-hard">
              <div className="mb-4.5 flex h-11 w-11 items-center justify-center rounded-lg border-2 border-foreground bg-grape">
                <Handshake className="h-5 w-5 text-foreground" />
              </div>
              <h4 className="font-heading mb-2 text-xl font-bold">
                Partnerships
              </h4>
              <p className="mb-4 text-sm text-muted-foreground">
                Interested in working with GoCollab?
              </p>
              <ul className="mb-5.5 grid gap-2 text-sm text-foreground/80">
                <li>● Agencies</li>
                <li>● Technology partners</li>
                <li>● Brand partnerships</li>
                <li>● Media enquiries</li>
              </ul>
              <a
                href="mailto:hello@messold.com"
                className="mt-auto block rounded-full border-2 border-foreground bg-foreground px-5 py-3 text-center text-sm font-semibold text-background shadow-hard transition-all hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none"
              >
                Get in Touch
              </a>
            </div>
          </div>
        </div>
      </section>
      <section className="py-[84px]">
        <div className="mx-auto max-w-[700px] px-6">
          <div className="text-muted-foreground mb-3.5 text-sm font-semibold tracking-wider uppercase">
            ✦ Get in touch
          </div>
          <h2 className="font-heading mb-7 text-3xl font-bold">
            Send us a message
          </h2>

          <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4.5">
            <div className="grid gap-4.5 md:grid-cols-2">
              <div>
                <label
                  className="mb-1.5 block text-xs font-semibold text-foreground/75"
                  htmlFor="cf-name"
                >
                  Full Name
                </label>
                <input
                  id="cf-name"
                  type="text"
                  placeholder="Jane Doe"
                  {...register("name")}
                  className={`w-full rounded-lg border-2 bg-card px-4 py-3 text-sm text-foreground outline-none focus:ring-3 focus:ring-primary/35 ${
                    errors.name ? "border-red-500" : "border-foreground"
                  }`}
                />
                {errors.name && (
                  <p className="mt-1.5 text-xs text-red-500 font-semibold">
                    {errors.name.message}
                  </p>
                )}
              </div>
              <div>
                <label
                  className="mb-1.5 block text-xs font-semibold text-foreground/75"
                  htmlFor="cf-email"
                >
                  Email Address
                </label>
                <input
                  id="cf-email"
                  type="email"
                  placeholder="jane@brand.com"
                  {...register("email")}
                  className={`w-full rounded-lg border-2 bg-card px-4 py-3 text-sm text-foreground outline-none focus:ring-3 focus:ring-primary/35 ${
                    errors.email ? "border-red-500" : "border-foreground"
                  }`}
                />
                {errors.email && (
                  <p className="mt-1.5 text-xs text-red-500 font-semibold">
                    {errors.email.message}
                  </p>
                )}
              </div>
            </div>

            <div>
              <label
                className="mb-1.5 block text-xs font-semibold text-foreground/75"
                htmlFor="cf-role"
              >
                I am a
              </label>
              <input
                id="cf-role"
                type="text"
                placeholder="Brand, Creator, Agency..."
                {...register("role")}
                className={`w-full rounded-lg border-2 bg-card px-4 py-3 text-sm text-foreground outline-none focus:ring-3 focus:ring-primary/35 ${
                  errors.role ? "border-red-500" : "border-foreground"
                }`}
              />
              {errors.role && (
                <p className="mt-1.5 text-xs text-red-500 font-semibold">
                  {errors.role.message}
                </p>
              )}
            </div>

            <div>
              <label
                className="mb-1.5 block text-xs font-semibold text-foreground/75"
                htmlFor="cf-subject"
              >
                Subject
              </label>
              <input
                id="cf-subject"
                type="text"
                placeholder="How can we help?"
                {...register("subject")}
                className={`w-full rounded-lg border-2 bg-card px-4 py-3 text-sm text-foreground outline-none focus:ring-3 focus:ring-primary/35 ${
                  errors.subject ? "border-red-500" : "border-foreground"
                }`}
              />
              {errors.subject && (
                <p className="mt-1.5 text-xs text-red-500 font-semibold">
                  {errors.subject.message}
                </p>
              )}
            </div>

            <div>
              <label
                className="mb-1.5 block text-xs font-semibold text-foreground/75"
                htmlFor="cf-message"
              >
                Message
              </label>
              <textarea
                id="cf-message"
                rows={5}
                placeholder="Tell us a bit more…"
                {...register("message")}
                className={`w-full rounded-lg border-2 bg-card px-4 py-3 text-sm text-foreground outline-none focus:ring-3 focus:ring-primary/35 ${
                  errors.message ? "border-red-500" : "border-foreground"
                }`}
              ></textarea>
              {errors.message && (
                <p className="mt-1.5 text-xs text-red-500 font-semibold">
                  {errors.message.message}
                </p>
              )}
            </div>

            <div className="mt-1.5 flex flex-wrap items-center gap-4">
              <button
                type="submit"
                disabled={isSubmitting}
                className={`rounded-full border-2 border-foreground bg-lime px-6.5 py-3.5 text-sm font-bold text-lime-foreground shadow-hard transition-all hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none ${
                  isSubmitting ? "opacity-75 cursor-not-allowed" : ""
                }`}
              >
                {isSubmitting ? "Sending..." : "Send Message"}
              </button>
              <span
                className={`text-sm font-semibold text-[#178a3a] transition-opacity duration-400 ${
                  submitted ? "opacity-100" : "hidden"
                }`}
              >
                ✓ Thanks — we'll be in touch within 1 business day.
              </span>
              {errorMsg && (
                <span className="text-sm font-semibold text-red-500">
                  {errorMsg}
                </span>
              )}
            </div>
          </form>
        </div>
      </section>
      <section className="bg-secondary/60 py-20">
        <div className="mx-auto max-w-[1080px] px-6">
          <div className="text-muted-foreground mb-3.5 text-center text-sm font-semibold tracking-wider uppercase">
            ✦ Other ways to reach us
          </div>
          <h2 className="font-heading mb-10 text-center text-3xl font-bold">
            Other ways to reach us
          </h2>
          <div className="grid gap-5 md:grid-cols-3">
            <div className="rounded-2xl border-2 border-foreground bg-card p-6 text-center shadow-sticker">
              <div className="text-muted-foreground mb-2.5 text-sm font-semibold uppercase">
                Support Email
              </div>
              <a
                href="mailto:support@gocollab.io"
                className="text-lg font-semibold text-primary hover:underline"
              >
                support@gocollab.io
              </a>
            </div>
            <div className="rounded-2xl border-2 border-foreground bg-card p-6 text-center shadow-sticker">
              <div className="text-muted-foreground mb-2.5 text-sm font-semibold uppercase">
                Business
              </div>
              <a
                href="mailto:hello@gocollab.io"
                className="text-lg font-semibold text-primary hover:underline"
              >
                hello@gocollab.io
              </a>
            </div>
            <div className="rounded-2xl border-2 border-foreground bg-card p-6 text-center shadow-sticker">
              <div className="text-muted-foreground mb-2.5 text-sm font-semibold uppercase">
                Working Hours
              </div>
              <p className="m-0 text-lg font-semibold text-foreground">
                Mon – Fri
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                10:00 AM – 7:00 PM IST
              </p>
            </div>
          </div>
        </div>
      </section>
      <section className="py-[84px]">
        <div className="mx-auto max-w-[700px] px-6">
          <div className="text-muted-foreground mb-3.5 text-sm font-semibold tracking-wider uppercase">
            ✦ FAQ
          </div>
          <h2 className="font-heading mb-7.5 text-3xl font-bold">
            Frequently asked questions
          </h2>

          <div className="grid gap-3">
            {[
              {
                q: "How do I become a creator?",
                a: "Create your profile, upload your portfolio, and complete the onboarding process.",
              },
              {
                q: "Do I need a minimum number of followers?",
                a: "No. Creators are evaluated based on the quality of their content, portfolio, and suitability for campaigns.",
              },
              {
                q: "How do brands place an order?",
                a: "Browse creators, select a package, provide a brief, and place your order through the platform.",
              },
              {
                q: "How are payments handled?",
                a: "Payments are processed securely through the platform according to the agreed project terms.",
              },
              {
                q: "Can I edit or cancel an order?",
                a: "Yes, depending on the order stage. Contact support if you need assistance.",
              },
            ].map((faq, i) => (
              <details
                key={i}
                className="group rounded-xl border-2 border-foreground bg-card p-[18px_22px] [&_summary::-webkit-details-marker]:hidden"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between text-lg font-semibold text-foreground">
                  {faq.q}
                  <span className="text-xl leading-none transition-transform duration-250 group-open:rotate-45">
                    +
                  </span>
                </summary>
                <p className="mt-3 text-muted-foreground animate-in slide-in-from-top-1 fade-in duration-300">
                  {faq.a}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>
      <section className="bg-grain bg-foreground py-16">
        <div className="mx-auto max-w-[700px] px-6 text-center">
          <h3 className="font-heading mb-3.5 text-2xl font-bold text-background">
            Need immediate assistance?
          </h3>
          <a
            href="mailto:support@gocollab.io"
            className="mt-1.5 inline-block rounded-full border-2 border-background bg-lime px-7 py-3 text-sm font-bold text-lime-foreground no-underline hover:opacity-90"
          >
            ✦ Email us — support@gocollab.io
          </a>
        </div>
      </section>
    </div>
  );
}
