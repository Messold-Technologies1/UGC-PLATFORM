"use client";

import Link from "next/link";
import { FileText, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useTemplatesQuery } from "@/features/notifications/hooks/use-notifications";

export default function NotificationTemplatesPage() {
  const { data: templates, isLoading, isError } = useTemplatesQuery();
  const isEmpty = !isLoading && !isError && templates?.length === 0;

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Email templates</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            WhatsApp copy lives in WhatsApp Manager; only email is edited here.
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/notifications/templates/new">
            <Plus className="mr-1 h-4 w-4" />
            New template
          </Link>
        </Button>
      </header>

      {isLoading ? (
        <div className="space-y-2">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      ) : isError ? (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <p className="text-sm font-medium">Could not load templates</p>
          <p className="text-muted-foreground mt-1 text-sm">
            The notifications API did not respond. Check the server logs.
          </p>
        </div>
      ) : isEmpty ? (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <FileText className="text-muted-foreground mx-auto h-6 w-6" />
          <p className="mt-3 text-sm font-medium">No templates yet</p>
          <p className="text-muted-foreground mx-auto mt-1 max-w-md text-sm">
            The bundled email templates are imported into the database when the
            server starts. An empty list means that import has not run against
            this environment yet — redeploy, or check the server logs for
            &quot;notification templates imported&quot;.
          </p>
          <Button asChild variant="outline" className="mt-4">
            <Link href="/admin/notifications/templates/new">
              <Plus className="mr-1 h-4 w-4" />
              New template
            </Link>
          </Button>
        </div>
      ) : (
        <ul className="divide-y rounded-lg border">
          {templates?.map((template) => (
            <li key={template.id}>
              <Link
                href={`/admin/notifications/templates/${template.id}`}
                className="hover:bg-muted/50 flex items-center justify-between gap-4 p-4"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <FileText className="text-muted-foreground h-4 w-4 shrink-0" />
                  <div className="min-w-0">
                    <p className="truncate font-mono text-sm">{template.name}</p>
                    {template.description && (
                      <p className="text-muted-foreground truncate text-xs">
                        {template.description}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Badge variant="secondary">v{template.version}</Badge>
                  {template._count.versions > 0 && (
                    <span className="text-muted-foreground text-xs">
                      {template._count.versions} earlier
                    </span>
                  )}
                  {!template.isActive && <Badge variant="outline">Inactive</Badge>}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
