"use client";

import { AlertTriangle, Loader2 } from "lucide-react";
import type { TemplatePreview } from "../types";

/**
 * The live preview column.
 *
 * Always rendered, never behind a tab: the whole point is to see the effect of
 * an edit without asking for it. It keeps the last good render on screen while
 * a new one is in flight, so typing does not flash the panel empty.
 */
export function TemplatePreviewPane({
  preview,
  isPending,
  error,
}: {
  preview: TemplatePreview | null;
  isPending: boolean;
  error: string | null;
}) {
  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-medium">Preview</h2>
        {isPending && (
          <span className="text-muted-foreground flex items-center gap-1 text-xs">
            <Loader2 className="h-3 w-3 animate-spin" />
            updating
          </span>
        )}
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <div>
            <p className="font-medium">This draft could not be rendered</p>
            <p className="mt-0.5">{error}</p>
            {preview && (
              <p className="mt-1 opacity-80">Showing the last render that worked.</p>
            )}
          </div>
        </div>
      )}

      {preview ? (
        <>
          <div className="rounded-md border bg-white/60 px-3 py-2">
            <p className="text-muted-foreground text-[11px] uppercase tracking-wide">
              Subject
            </p>
            <p className="mt-0.5 text-sm break-words">
              {preview.subject || (
                <span className="text-red-600">
                  empty — this would be rejected on send
                </span>
              )}
            </p>
          </div>
          <iframe
            title="Rendered preview"
            srcDoc={preview.html}
            sandbox=""
            className="min-h-0 w-full flex-1 rounded-md border bg-white"
          />
          <p className="text-muted-foreground text-xs">
            Rendered with each variable&apos;s example value.
          </p>
        </>
      ) : (
        !error && (
          <div className="text-muted-foreground flex flex-1 items-center justify-center rounded-md border border-dashed p-8 text-sm">
            {isPending ? "Rendering…" : "Start typing to see the preview."}
          </div>
        )
      )}
    </div>
  );
}
