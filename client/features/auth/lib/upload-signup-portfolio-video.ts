import { uploadFileInParts } from "@/lib/s3-multipart-upload";
import {
  presignCreatorPortfolioVideo,
  putFileToPresignedUrl,
} from "../api/creator-signup";
import {
  abortSignupVideoMultipart,
  completeSignupVideoMultipart,
  createSignupVideoMultipart,
  signSignupVideoPart,
} from "../api/signup-portfolio-video-multipart";

/** Files larger than this upload via S3 multipart; smaller ones use a single PUT. */
const MULTIPART_THRESHOLD_BYTES = 10 * 1024 * 1024; // 10 MiB

function resolveVideoContentType(file: File): string {
  const contentType = file.type?.trim();
  if (contentType) return contentType;
  const name = file.name.toLowerCase();
  if (name.endsWith(".mov")) return "video/quicktime";
  if (name.endsWith(".webm")) return "video/webm";
  return "video/mp4";
}

/**
 * Upload a portfolio video during signup (no auth yet — scoped by email) and
 * return its temporary S3 key. Large files go through multipart so they aren't
 * bound by the single-PUT expiry; both paths report 0..1 progress.
 */
export async function uploadSignupPortfolioVideo(
  file: File,
  email: string,
  onProgress?: (fraction: number) => void,
  signal?: AbortSignal,
): Promise<string> {
  const contentType = resolveVideoContentType(file);

  if (file.size > MULTIPART_THRESHOLD_BYTES) {
    const { key } = await uploadFileInParts(
      file,
      {
        create: () =>
          createSignupVideoMultipart({
            email,
            contentType,
            contentLength: file.size,
          }),
        signPart: ({ key, uploadId, partNumber }) =>
          signSignupVideoPart({ email, key, uploadId, partNumber }),
        complete: ({ key, uploadId, parts }) =>
          completeSignupVideoMultipart({ email, key, uploadId, parts }),
        abort: ({ key, uploadId }) =>
          abortSignupVideoMultipart({ email, key, uploadId }),
      },
      { onProgress, signal },
    );
    return key;
  }

  const presign = await presignCreatorPortfolioVideo({
    email,
    contentType,
    contentLength: file.size,
  });
  await putFileToPresignedUrl(file, presign);
  onProgress?.(1);
  return presign.key;
}
