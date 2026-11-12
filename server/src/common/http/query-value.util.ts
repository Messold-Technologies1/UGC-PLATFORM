/**
 * Read a query parameter that is meant to be a single string.
 *
 * With `query parser: 'extended'` a caller controls the SHAPE of a query
 * value, not just its text: `?role=brand` gives a string, but `?role[x]=1`
 * gives an object and `?role=a&role=b` gives an array. A handler that
 * declares `@Query('role') role?: string` is told it has a string and gets
 * whichever of those three was sent, so calling `.trim()` or `.toUpperCase()`
 * on it throws — a 500 from a crafted URL, on public routes among others.
 *
 * Anything that is not a plain string is reduced to one, or dropped:
 *
 *   'brand'            -> 'brand'
 *   ['a', 'b']         -> 'a'      (first wins, as a single-valued param)
 *   { x: '1' }         -> undefined
 *   ''                 -> undefined
 *
 * Params that go through a DTO need none of this — class-validator rejects
 * the wrong type. This is for the handful read as bare strings.
 */
export function singleQueryString(value: unknown): string | undefined {
  if (typeof value === 'string') {
    return value.length > 0 ? value : undefined;
  }
  if (Array.isArray(value)) {
    const first = value.find((entry) => typeof entry === 'string');
    return typeof first === 'string' && first.length > 0 ? first : undefined;
  }
  return undefined;
}
