import { headers } from "next/headers";

/** Path the user requested, for login callbackUrl (set by middleware). */
export async function getServerCallbackPath(
  fallbackPath: string,
): Promise<string> {
  const headerList = await headers();
  const pathname = headerList.get("x-pathname")?.trim();
  if (pathname?.startsWith("/") && !pathname.startsWith("//")) {
    return pathname;
  }
  return fallbackPath;
}
