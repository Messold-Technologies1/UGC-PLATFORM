/**
 * Content hashing for uploads, so the server can refuse a file the user has
 * already uploaded.
 *
 * Deliberately best-effort. Every caller treats `undefined` as "skip the
 * duplicate check", which is what the server does with a missing hash, so a
 * browser without Web Crypto or a file too large to buffer still uploads
 * normally.
 */

/**
 * Above this size the file is not hashed. `crypto.subtle.digest` needs the
 * whole file in an ArrayBuffer, and buffering a multi-hundred-megabyte video
 * risks an out-of-memory crash on a phone — losing the upload entirely to save
 * the user from a duplicate they probably did not make.
 */
export const MAX_HASHABLE_BYTES = 200 * 1024 * 1024; // 200 MiB

/** SHA-256 hex digest of a file, or undefined when it cannot be computed. */
export async function computeFileSha256(
  file: Blob,
): Promise<string | undefined> {
  try {
    if (!globalThis.crypto?.subtle) return undefined;
    if (file.size > MAX_HASHABLE_BYTES) return undefined;
    const buffer = await file.arrayBuffer();
    const digest = await globalThis.crypto.subtle.digest("SHA-256", buffer);
    return Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  } catch {
    return undefined;
  }
}
