/**
 * Feed timestamps. "2 hours ago" close up, a real date once that stops being
 * the useful thing to know.
 */
export function formatEventTime(iso: string): string {
  const then = new Date(iso);
  if (Number.isNaN(then.getTime())) return "";

  const diffMs = Date.now() - then.getTime();
  const minutes = Math.floor(diffMs / 60_000);

  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;

  const days = Math.floor(hours / 24);
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;

  return then.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    ...(then.getFullYear() === new Date().getFullYear()
      ? {}
      : { year: "numeric" }),
  });
}

/**
 * The heading a post sits under in the feed. Posts arrive newest-first, so
 * walking the list and emitting a heading whenever this value changes gives
 * Today / Yesterday / a date, in order, with no grouping pass.
 */
export function eventDayLabel(iso: string): string {
  const then = new Date(iso);
  if (Number.isNaN(then.getTime())) return "";

  const startOfDay = (d: Date) =>
    new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const days = Math.round(
    (startOfDay(new Date()) - startOfDay(then)) / 86_400_000,
  );

  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  return then.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    ...(then.getFullYear() === new Date().getFullYear()
      ? {}
      : { year: "numeric" }),
  });
}
