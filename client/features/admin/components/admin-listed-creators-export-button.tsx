"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { isAxiosError } from "axios";
import { Button } from "@/components/ui/button";
import { downloadListedCreatorsExport } from "@/features/admin/api/download-listed-creators-export";

export function AdminListedCreatorsExportButton({
  search,
  disabled = false,
}: {
  /** When set, export is filtered with the same search as the list. */
  search?: string;
  disabled?: boolean;
}) {
  const [isExporting, setIsExporting] = useState(false);

  async function handleExport() {
    if (isExporting) return;
    setIsExporting(true);
    try {
      await downloadListedCreatorsExport({
        format: "xls",
        search: search?.trim() || undefined,
      });
      toast.success("Export downloaded", {
        description: "Listed creators Excel file (name, phone, Instagram).",
      });
    } catch (error) {
      let message = "Could not export listed creators.";
      if (isAxiosError(error)) {
        const data = error.response?.data;
        if (data instanceof Blob) {
          try {
            const text = await data.text();
            const parsed = JSON.parse(text) as { message?: string | string[] };
            if (typeof parsed.message === "string") message = parsed.message;
            else if (Array.isArray(parsed.message) && parsed.message[0]) {
              message = parsed.message[0];
            }
          } catch {
            // keep default
          }
        } else if (typeof data?.message === "string") {
          message = data.message;
        }
      }
      toast.error(message);
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="h-10 shrink-0 gap-2 rounded-xl border-border/60 bg-background/80 px-3 font-semibold"
      disabled={disabled || isExporting}
      onClick={() => {
        void handleExport();
      }}
    >
      {isExporting ? (
        <Loader2 className="size-4 animate-spin" aria-hidden />
      ) : (
        <Download className="size-4" aria-hidden />
      )}
      {isExporting ? "Exporting…" : "Export Excel"}
    </Button>
  );
}
