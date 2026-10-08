import { isAxiosError } from "axios";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { computeFileSha256 } from "@/lib/file-hash";
import type { DeliveryAssetKind } from "../api/presign-delivery-upload";
import { uploadDeliveryFile } from "../lib/upload-delivery-file";
import {
  submitDelivery,
  type SubmitDeliveryResponse,
} from "../api/submit-delivery";

type SubmitDeliveryFlowVariables = {
  orderId: string;
  files: File[];
  note?: string;
  /** Overall upload progress across every file, as a 0..1 fraction. */
  onProgress?: (fraction: number) => void;
};

function resolveFileKind(file: File): DeliveryAssetKind {
  if (
    file.type.startsWith("image/") ||
    /\.(jpe?g|png|webp)$/i.test(file.name)
  ) {
    return "image";
  }

  return "video";
}

function resolveContentType(file: File): string {
  const contentType = file.type?.trim();
  if (contentType) {
    return contentType;
  }

  const name = file.name.toLowerCase();
  if (name.endsWith(".png")) return "image/png";
  if (name.endsWith(".jpg") || name.endsWith(".jpeg")) return "image/jpeg";
  if (name.endsWith(".webp")) return "image/webp";
  if (name.endsWith(".mov")) return "video/quicktime";
  if (name.endsWith(".webm")) return "video/webm";
  return "video/mp4";
}

function getUploadErrorMessage(error: unknown): string {
  if (isAxiosError(error)) {
    const message = error.response?.data?.message;

    if (typeof message === "string" && message.trim()) {
      return message;
    }

    if (Array.isArray(message) && message.length > 0) {
      return message.join(", ");
    }

    if (error.message.trim()) {
      return error.message;
    }
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return "Something went wrong";
}

export function useSubmitDeliveryFlowMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ["orders", "submit-delivery-flow"],
    mutationFn: async ({
      orderId,
      files,
      note,
      onProgress,
    }: SubmitDeliveryFlowVariables): Promise<SubmitDeliveryResponse> => {
      const uploadInputs = files.map((file) => ({
        contentType: resolveContentType(file),
        kind: resolveFileKind(file),
      }));

      // Undefined for files over the hashing cap — the server treats a missing
      // hash as "skip the duplicate check" rather than buffering a gigabyte of
      // video into an ArrayBuffer just to notice a re-upload.
      const hashes = await Promise.all(files.map((f) => computeFileSha256(f)));

      // Progress is weighted by size so a 900 MB video is not drowned out by
      // the thumbnail sitting next to it.
      const totalBytes = files.reduce((sum, f) => sum + f.size, 0);
      const uploadedByIndex = new Map<number, number>();
      const reportProgress = () => {
        if (!onProgress || totalBytes === 0) return;
        let done = 0;
        for (const bytes of uploadedByIndex.values()) done += bytes;
        onProgress(Math.min(done / totalBytes, 1));
      };

      // Sequential on purpose: each large file already uploads its own parts in
      // parallel, so running every file at once would multiply the open
      // connections and starve them all on a phone.
      const keys: string[] = [];
      for (const [index, file] of files.entries()) {
        const { key } = await uploadDeliveryFile({
          orderId,
          file,
          contentType: uploadInputs[index].contentType,
          kind: uploadInputs[index].kind,
          onProgress: (fraction) => {
            uploadedByIndex.set(index, fraction * file.size);
            reportProgress();
          },
        });
        uploadedByIndex.set(index, file.size);
        reportProgress();
        keys.push(key);
      }

      return submitDelivery({
        orderId,
        note,
        assets: keys.map((key, index) => ({
          key,
          kind: uploadInputs[index].kind,
          sha256: hashes[index],
        })),
      });
    },
    onSuccess: async () => {
      // No toast here: the caller owns the success message, and this hook used
      // to add a second one that leaked our internal "preview" wording into the
      // creator's view. The refetch below re-reads the delivery so the uploader
      // locks itself immediately after a submit.
      await queryClient.invalidateQueries({ queryKey: ["orders", "creator"] });
    },
    onError: (error) => {
      toast.error("Delivery upload failed", {
        description: getUploadErrorMessage(error),
      });
    },
  });
}
