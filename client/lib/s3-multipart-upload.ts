/**
 * Browser-side S3 multipart upload orchestrator.
 *
 * Splits a File into parts, uploads them in parallel against per-part presigned
 * URLs (with real progress via XHR — which `fetch` can't report), and finalizes
 * the upload. Because each part has its own presigned URL and its own expiry,
 * a large file is never bound by a single-PUT 15-minute window. On any failure
 * the upload is aborted so no orphaned parts are left behind.
 */

export type MultipartCompletedPart = { partNumber: number; etag: string };

export type MultipartCreateResult = {
  key: string;
  uploadId: string;
  partSizeBytes: number;
};

export type MultipartUploadHandlers = {
  create: () => Promise<MultipartCreateResult>;
  signPart: (args: {
    key: string;
    uploadId: string;
    partNumber: number;
  }) => Promise<string>;
  complete: (args: {
    key: string;
    uploadId: string;
    parts: MultipartCompletedPart[];
  }) => Promise<{ key: string }>;
  abort: (args: { key: string; uploadId: string }) => Promise<void>;
};

export type MultipartUploadOptions = {
  /** Called with a 0..1 fraction as bytes are uploaded. */
  onProgress?: (fraction: number) => void;
  /** Max parts uploading at once. */
  concurrency?: number;
  /** Per-part retry attempts on transient failures. */
  maxRetriesPerPart?: number;
  signal?: AbortSignal;
};

/** PUT a single blob to a presigned URL via XHR, resolving the part's ETag. */
function putPart(
  url: string,
  blob: Blob,
  partNumber: number,
  onBytes: (loaded: number) => void,
  signal?: AbortSignal,
): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url, true);

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onBytes(event.loaded);
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        // Requires the bucket CORS to expose the ETag header.
        const etag = xhr.getResponseHeader("ETag");
        if (!etag) {
          reject(
            new Error(
              `Part ${partNumber} succeeded but no ETag was returned — ` +
                `check the S3 bucket CORS "ExposeHeaders" includes "ETag".`,
            ),
          );
          return;
        }
        onBytes(blob.size);
        resolve(etag);
        return;
      }
      reject(new Error(`Part ${partNumber} upload failed (${xhr.status})`));
    };
    xhr.onerror = () =>
      reject(new Error(`Part ${partNumber} upload failed (network error)`));
    xhr.onabort = () => reject(new DOMException("Upload aborted", "AbortError"));

    if (signal) {
      if (signal.aborted) {
        xhr.abort();
        return;
      }
      signal.addEventListener("abort", () => xhr.abort(), { once: true });
    }

    xhr.send(blob);
  });
}

export async function uploadFileInParts(
  file: File,
  handlers: MultipartUploadHandlers,
  options: MultipartUploadOptions = {},
): Promise<{ key: string }> {
  const concurrency = Math.max(1, options.concurrency ?? 3);
  const maxRetries = Math.max(0, options.maxRetriesPerPart ?? 2);

  const { key, uploadId, partSizeBytes } = await handlers.create();

  try {
    const totalParts = Math.max(1, Math.ceil(file.size / partSizeBytes));
    const completed: MultipartCompletedPart[] = [];
    const loadedByPart = new Map<number, number>();

    const reportProgress = () => {
      if (!options.onProgress || file.size === 0) return;
      let sum = 0;
      for (const value of loadedByPart.values()) sum += value;
      options.onProgress(Math.min(sum / file.size, 1));
    };

    let nextPart = 1;
    const uploadWorker = async () => {
      for (;;) {
        if (options.signal?.aborted) {
          throw new DOMException("Upload aborted", "AbortError");
        }
        const partNumber = nextPart++;
        if (partNumber > totalParts) return;

        const start = (partNumber - 1) * partSizeBytes;
        const end = Math.min(start + partSizeBytes, file.size);
        const blob = file.slice(start, end);

        let attempt = 0;
        for (;;) {
          try {
            const url = await handlers.signPart({ key, uploadId, partNumber });
            const etag = await putPart(
              url,
              blob,
              partNumber,
              (loaded) => {
                loadedByPart.set(partNumber, loaded);
                reportProgress();
              },
              options.signal,
            );
            completed.push({ partNumber, etag });
            break;
          } catch (error) {
            const aborted =
              error instanceof DOMException && error.name === "AbortError";
            if (aborted || attempt >= maxRetries) throw error;
            attempt += 1;
            loadedByPart.set(partNumber, 0);
            reportProgress();
            await new Promise((r) => setTimeout(r, 500 * 2 ** (attempt - 1)));
          }
        }
      }
    };

    const workers = Array.from(
      { length: Math.min(concurrency, totalParts) },
      () => uploadWorker(),
    );
    await Promise.all(workers);

    completed.sort((a, b) => a.partNumber - b.partNumber);
    return await handlers.complete({ key, uploadId, parts: completed });
  } catch (error) {
    // Best-effort cleanup; never mask the original failure.
    try {
      await handlers.abort({ key, uploadId });
    } catch {
      // ignore
    }
    throw error;
  }
}
