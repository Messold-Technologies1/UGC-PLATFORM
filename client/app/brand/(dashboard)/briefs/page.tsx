"use client";

import Link from "next/link";
import { AlertCircle, FileText, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { useListBriefsQuery } from "@/features/briefs/hooks/use-list-briefs-query";
import { BriefCard } from "@/features/briefs/components/brief-card";

export default function BriefsPage() {
  const { data, isLoading, isError, error } = useListBriefsQuery();
  const briefs = data?.items ?? [];

  return (
    <div className="flex flex-col gap-8 w-full px-4 sm:px-6 md:px-8 py-6 lg:py-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div data-tour="brand-briefs-heading">
          <h1 className="text-3xl font-extrabold tracking-tight md:text-4xl">
            My Briefs
          </h1>
          <p className="mt-2 text-muted-foreground">
            Manage your saved campaign briefs to reuse across orders.
          </p>
        </div>
        <Button
          asChild
          data-tour="brand-briefs-create"
          className="rounded-xl font-bold shadow-sm transition-all hover:opacity-90"
        >
          <Link href="/brand/briefs/create">
            <Plus className="mr-2 h-4 w-4" />
            Create Brief
          </Link>
        </Button>
      </div>

      {isLoading ? (
        <div className="flex min-h-[400px] items-center justify-center rounded-2xl border border-border/40 bg-card p-6">
          <Spinner className="size-8 text-primary" />
        </div>
      ) : isError ? (
        <div className="flex min-h-[320px] flex-col items-center justify-center rounded-2xl border border-destructive/20 bg-destructive/5 p-6 text-center">
          <div className="mb-4 flex size-12 items-center justify-center rounded-full bg-destructive/10">
            <AlertCircle className="size-6 text-destructive" />
          </div>
          <h3 className="text-lg font-bold tracking-tight text-foreground">
            Unable to load briefs
          </h3>
          <p className="mt-2 max-w-sm text-sm text-muted-foreground">
            {error?.message ||
              "The saved briefs request did not return usable data."}
          </p>
        </div>
      ) : briefs.length === 0 ? (
        <div className="flex min-h-[400px] flex-col items-center justify-center rounded-2xl border border-dashed border-border/60 bg-card/50 p-6 text-center">
          <div className="mb-4 flex size-12 items-center justify-center rounded-full bg-primary/10">
            <FileText className="size-6 text-primary" />
          </div>
          <h3 className="text-lg font-bold tracking-tight text-foreground">
            No briefs found
          </h3>
          <p className="mt-2 max-w-sm text-sm text-muted-foreground">
            You haven't created any briefs yet. Create a brief to provide
            detailed instructions to creators.
          </p>
          <Button asChild className="mt-6 rounded-xl font-bold">
            <Link href="/brand/briefs/create">Create your first brief</Link>
          </Button>
        </div>
      ) : (
        <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
          {briefs.map((brief) => (
            <div key={brief.id} className="min-w-0">
              <BriefCard brief={brief} mode="link" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
