import { uploadFileInParts } from "@/lib/s3-multipart-upload";
import { presignPortfolioUpload } from "../api/presign-portfolio-upload";
import {
  abortPortfolioMultipartUpload,
  completePortfolioMultipartUpload,
  createPortfolioMultipartUpload,
  signPortfolioMultipartPart,
} from "../api/multipart-portfolio-upload";
import type { PortfolioApiRequestOptions } from "../api/types";

/** Hard cap on a single portfolio video. Must match the server DTO. */
export const PORTFOLIO_VIDEO_MAX_BYTES = 1024 * 1024 * 1024; // 1 GiB

/** Files larger than this upload via S3 multipart; smaller ones use a single PUT. */
const MULTIPART_THRESHOLD_BYTES = 10 * 1024 * 1024; // 10 MiB

export function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  }
  return `${Math.round(bytes / (1024 * 1024))} MB`;
}

/** Single-PUT upload to a presigned URL with progress reporting via XHR. */
function putWithProgress(
  url: string,
  file: File,
  headers: Record<string, string>,
  onProgress?: (fraction: number) => void,
  signal?: AbortSignal,
): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url, true);
    for (const [name, value] of Object.entries(headers)) {
      xhr.setRequestHeader(name, value);
    }

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) {
        onProgress(Math.min(event.loaded / event.total, 1));
      }
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress?.(1);
        resolve();
        return;
      }
      reject(new Error(`Upload failed (${xhr.status})`));
    };
    xhr.onerror = () => reject(new Error("Upload failed (network error)"));
    xhr.onabort = () => reject(new DOMException("Upload aborted", "AbortError"));

    if (signal) {
      if (signal.aborted) {
        xhr.abort();
        return;
      }
      signal.addEventListener("abort", () => xhr.abort(), { once: true });
    }

    xhr.send(file);
  });
}

/**
 * Upload a portfolio video to S3 and return its object key. Large files go
 * through multipart (parallel, resumable-friendly, no single-PUT expiry);
 * small files use a single presigned PUT. Both report progress as a 0..1
 * fraction.
 */
export async function uploadPortfolioVideo(
  file: File,
  contentType: string,
  options?: PortfolioApiRequestOptions,
  onProgress?: (fraction: number) => void,
  signal?: AbortSignal,
): Promise<string> {
  if (file.size > MULTIPART_THRESHOLD_BYTES) {
    const { key } = await uploadFileInParts(
      file,
      {
        create: () =>
          createPortfolioMultipartUpload(
            { kind: "video", contentType, contentLength: file.size },
            options,
          ),
        signPart: (args) => signPortfolioMultipartPart(args, options),
        complete: (args) => completePortfolioMultipartUpload(args, options),
        abort: (args) => abortPortfolioMultipartUpload(args, options),
      },
      { onProgress, signal },
    );
    return key;
  }

  const presign = await presignPortfolioUpload(
    { kind: "video", contentType, contentLength: file.size },
    options,
  );
  await putWithProgress(
    presign.uploadUrl,
    file,
    presign.headers,
    onProgress,
    signal,
  );
  return presign.key;
}
