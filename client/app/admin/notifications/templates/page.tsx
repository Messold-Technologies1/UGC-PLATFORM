"use client";

import Link from "next/link";
import { FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useTemplatesQuery } from "@/features/notifications/hooks/use-notifications";

export default function NotificationTemplatesPage() {
  const { data: templates, isLoading } = useTemplatesQuery();

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <header>
        <h1 className="text-2xl font-semibold">Email templates</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          WhatsApp copy lives in WhatsApp Manager; only email is edited here.
        </p>
      </header>

      {isLoading ? (
        <div className="space-y-2">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
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
