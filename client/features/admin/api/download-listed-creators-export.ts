import api from "@/lib/api";
import { ENDPOINTS } from "@/lib/endpoints";

export type ExportListedCreatorsFormat = "csv" | "xls";

function filenameFromContentDisposition(
  header: string | undefined,
  fallback: string,
): string {
  if (!header) return fallback;
  const utfMatch = /filename\*=UTF-8''([^;]+)/i.exec(header);
  if (utfMatch?.[1]) {
    try {
      return decodeURIComponent(utfMatch[1].trim());
    } catch {
      // fall through
    }
  }
  const plainMatch = /filename="?([^";]+)"?/i.exec(header);
  return plainMatch?.[1]?.trim() || fallback;
}

/**
 * Downloads listed creators (name, phone, Instagram) as CSV or Excel.
 * Triggers a browser file save.
 */
export async function downloadListedCreatorsExport(params?: {
  format?: ExportListedCreatorsFormat;
  search?: string;
}): Promise<void> {
  const format = params?.format ?? "csv";
  const { data, headers } = await api.get<Blob>(
    ENDPOINTS.ADMIN.CREATORS.EXPORT_LISTED,
    {
      params: {
        format,
        ...(params?.search?.trim() ? { search: params.search.trim() } : {}),
      },
      responseType: "blob",
    },
  );

  const stamp = new Date().toISOString().slice(0, 10);
  const fallback = `listed-creators-${stamp}.${format === "xls" ? "xls" : "csv"}`;
  const filename = filenameFromContentDisposition(
    headers["content-disposition"] as string | undefined,
    fallback,
  );

  const url = URL.createObjectURL(data);
  try {
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.rel = "noopener";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  } finally {
    URL.revokeObjectURL(url);
  }
}
