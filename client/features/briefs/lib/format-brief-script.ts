export function formatBriefScript(
  script: Record<string, unknown> | unknown[] | null | undefined,
): { label: string; text?: string } | null {
  if (!script || typeof script !== "object") return null;

  if (Array.isArray(script)) {
    return {
      label: "Structured script",
      text: JSON.stringify(script, null, 2),
    };
  }

  const label =
    typeof script.label === "string" && script.label.trim()
      ? script.label.trim()
      : typeof script.mode === "string" && script.mode.trim()
        ? script.mode
            .split("_")
            .map((part) => part.charAt(0) + part.slice(1).toLowerCase())
            .join(" ")
        : "Script";
  const text =
    typeof script.text === "string" && script.text.trim()
      ? script.text.trim()
      : undefined;

  return { label, text };
}
