import { isAxiosError } from "axios";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  presignDeliveryUpload,
  putDeliveryFileToPresignedUrl,
  type DeliveryAssetKind,
} from "../api/presign-delivery-upload";
import {
  submitDelivery,
  type SubmitDeliveryResponse,
} from "../api/submit-delivery";

type SubmitDeliveryFlowVariables = {
  orderId: string;
  files: File[];
  note?: string;
};

function resolveFileKind(file: File): DeliveryAssetKind {
  if (file.type.startsWith("image/") || /\.(jpe?g|png|webp)$/i.test(file.name)) {
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
    }: SubmitDeliveryFlowVariables): Promise<SubmitDeliveryResponse> => {
      const uploadInputs = files.map((file) => ({
        contentType: resolveContentType(file),
        contentLength: file.size,
        kind: resolveFileKind(file),
      }));

      const presign = await presignDeliveryUpload({
        orderId,
        files: uploadInputs,
      });

      if (presign.uploads.length !== files.length) {
        throw new Error("Upload preparation returned an unexpected file count");
      }

      await Promise.all(
        files.map((file, index) =>
          putDeliveryFileToPresignedUrl(file, presign.uploads[index]),
        ),
      );

      return submitDelivery({
        orderId,
        note,
        assets: presign.uploads.map((upload, index) => ({
          key: upload.key,
          kind: uploadInputs[index].kind,
        })),
      });
    },
    onSuccess: async () => {
      toast.success("Delivery submitted successfully. Awaiting brand approval!");
      await queryClient.invalidateQueries({ queryKey: ["orders", "creator"] });
    },
    onError: (error) => {
      toast.error("Delivery upload failed", {
        description: getUploadErrorMessage(error),
      });
    },
  });
}
