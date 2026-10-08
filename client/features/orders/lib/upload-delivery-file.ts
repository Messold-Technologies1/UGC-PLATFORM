import { uploadFileInParts } from "@/lib/s3-multipart-upload";
import { putToPresignedUrl } from "@/lib/s3-put-upload";
import {
  presignDeliveryUpload,
  type DeliveryAssetKind,
} from "../api/presign-delivery-upload";
import {
  abortDeliveryMultipartUpload,
  completeDeliveryMultipartUpload,
  createDeliveryMultipartUpload,
  signDeliveryMultipartPart,
} from "../api/multipart-delivery-upload";

/** Hard cap on a single delivery asset. Must match the server DTO. */
export const DELIVERY_ASSET_MAX_BYTES = 500 * 1024 * 1024; // 500 MiB

/** Files larger than this upload via S3 multipart; smaller ones use a single PUT. */
const MULTIPART_THRESHOLD_BYTES = 10 * 1024 * 1024; // 10 MiB

export function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024 * 1024) {
    const gb = bytes / (1024 * 1024 * 1024);
    return `${Number.isInteger(gb) ? gb : gb.toFixed(1)} GB`;
  }
  return `${Math.round(bytes / (1024 * 1024))} MB`;
}

/**
 * Upload one delivery asset to S3 and return its object key.
 *
 * Large files go through multipart: each part has its own presigned URL, so a
 * half-gigabyte video is never racing a single PUT's expiry, slow parts retry
 * on their own, and a failure aborts the upload instead of stranding parts in
 * the bucket. Small files take the cheaper single-PUT path. Both report
 * progress as a 0..1 fraction.
 */
export async function uploadDeliveryFile(params: {
  orderId: string;
  file: File;
  contentType: string;
  kind: DeliveryAssetKind;
  onProgress?: (fraction: number) => void;
  signal?: AbortSignal;
}): Promise<{ key: string }> {
  const { orderId, file, contentType, kind, onProgress, signal } = params;

  if (file.size > MULTIPART_THRESHOLD_BYTES) {
    return uploadFileInParts(
      file,
      {
        create: () =>
          createDeliveryMultipartUpload(orderId, {
            contentType,
            contentLength: file.size,
            kind,
          }),
        signPart: (args) => signDeliveryMultipartPart(orderId, args),
        complete: (args) => completeDeliveryMultipartUpload(orderId, args),
        abort: (args) => abortDeliveryMultipartUpload(orderId, args),
      },
      { onProgress, signal },
    );
  }

  const presign = await presignDeliveryUpload({
    orderId,
    files: [{ contentType, contentLength: file.size, kind }],
  });
  const upload = presign.uploads[0];
  if (!upload) {
    throw new Error("Upload preparation returned no presigned URL");
  }

  await putToPresignedUrl(
    upload.uploadUrl,
    file,
    upload.headers,
    onProgress,
    signal,
  );
  return { key: upload.key };
}
