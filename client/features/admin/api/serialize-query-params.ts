/**
 * Serialize query params the way this API can actually parse them.
 *
 * The server runs Express 5, whose `query parser` defaults to `simple`
 * (Node's `querystring`) and does NOT understand bracket notation. Axios's
 * default array format is `key[]=value`, which therefore arrives as a literal
 * property named `key[]` — and because the global ValidationPipe runs with
 * `forbidNonWhitelisted`, that is not ignored but rejected outright:
 *
 *   400  {"message":["property creatorType[] should not exist"]}
 *
 * Repeating the key instead (`key=a&key=b`) parses into a real array. This is
 * the same shape `serializeCreatorListApiParams` produces for the public
 * browse list, which is why that page never hit this.
 *
 * Empty values are dropped rather than sent blank: `city=` would fail a
 * `@MaxLength`-style check or filter on an empty string, when what is meant
 * is "no filter".
 */
export function serializeQueryParams(params: unknown): string {
  if (!params || typeof params !== "object") return "";
  const search = new URLSearchParams();

  for (const [key, value] of Object.entries(
    params as Record<string, unknown>,
  )) {
    if (value === undefined || value === null || value === "") continue;

    if (Array.isArray(value)) {
      for (const entry of value) {
        if (entry === undefined || entry === null || entry === "") continue;
        search.append(key, String(entry));
      }
      continue;
    }

    search.set(key, String(value));
  }

  return search.toString();
}
