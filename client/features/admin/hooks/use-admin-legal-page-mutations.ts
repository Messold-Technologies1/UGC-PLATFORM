import { isAxiosError } from "axios";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  saveLegalPageDraft,
  importLegalPageDraft,
  submitLegalPageForReview,
  publishLegalPageDraft,
  rejectLegalPageDraft,
  discardLegalPageDraft,
  createLegalPage,
  restoreLegalPageVersion,
} from "../api/legal-pages";
import {
  adminLegalPagesQueryKey,
  adminLegalPageDetailQueryKey,
} from "./use-admin-legal-pages-query";
import type {
  SaveDraftInput,
  CreateLegalPageInput,
  ImportDraftInput,
  RejectDraftInput,
} from "../types";

function getErrorMessage(error: unknown, fallback: string) {
  if (!isAxiosError(error)) return fallback;
  const message = error.response?.data?.message;
  if (Array.isArray(message)) return message.join(", ");
  if (typeof message === "string") return message;
  return fallback;
}

export function useCreateLegalPageMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ["admin", "legal-pages", "create"],
    mutationFn: (payload: CreateLegalPageInput) => createLegalPage(payload),
    onSuccess: async () => {
      toast.success("Legal page created.");
      await queryClient.invalidateQueries({
        queryKey: adminLegalPagesQueryKey(),
      });
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, "Unable to create legal page."));
    },
  });
}

export function useSaveLegalPageDraftMutation(slug: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ["admin", "legal-pages", slug, "save-draft"],
    mutationFn: (payload: SaveDraftInput) => saveLegalPageDraft(slug, payload),
    onSuccess: async () => {
      toast.success("Draft saved.");
      await queryClient.invalidateQueries({
        queryKey: adminLegalPageDetailQueryKey(slug),
      });
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, "Unable to save draft."));
    },
  });
}

export function useImportLegalPageDraftMutation(slug: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ["admin", "legal-pages", slug, "import-draft"],
    mutationFn: (payload: ImportDraftInput) =>
      importLegalPageDraft(slug, payload),
    onSuccess: async (draft) => {
      toast.success(
        `Imported ${draft.sections.length} section${
          draft.sections.length === 1 ? "" : "s"
        } into the draft.`,
      );
      await queryClient.invalidateQueries({
        queryKey: adminLegalPageDetailQueryKey(slug),
      });
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, "Unable to import document."));
    },
  });
}

export function useSubmitLegalPageForReviewMutation(slug: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ["admin", "legal-pages", slug, "submit-review"],
    mutationFn: () => submitLegalPageForReview(slug),
    onSuccess: async () => {
      toast.success("Draft submitted for review.");
      await queryClient.invalidateQueries({
        queryKey: adminLegalPageDetailQueryKey(slug),
      });
    },
    onError: (error) => {
      toast.error(
        getErrorMessage(error, "Unable to submit draft for review."),
      );
    },
  });
}

export function usePublishLegalPageDraftMutation(slug: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ["admin", "legal-pages", slug, "publish"],
    mutationFn: () => publishLegalPageDraft(slug),
    onSuccess: async () => {
      toast.success("Legal page published.");
      await queryClient.invalidateQueries({
        queryKey: adminLegalPagesQueryKey(),
      });
      await queryClient.invalidateQueries({
        queryKey: adminLegalPageDetailQueryKey(slug),
      });
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, "Unable to publish draft."));
    },
  });
}

export function useRejectLegalPageDraftMutation(slug: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ["admin", "legal-pages", slug, "reject-draft"],
    mutationFn: (payload?: RejectDraftInput) =>
      rejectLegalPageDraft(slug, payload),
    onSuccess: async () => {
      toast.success("Draft sent back for revision.");
      await queryClient.invalidateQueries({
        queryKey: adminLegalPageDetailQueryKey(slug),
      });
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, "Unable to reject draft."));
    },
  });
}

export function useDiscardLegalPageDraftMutation(slug: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ["admin", "legal-pages", slug, "discard-draft"],
    mutationFn: () => discardLegalPageDraft(slug),
    onSuccess: async () => {
      toast.info("Draft discarded.");
      await queryClient.invalidateQueries({
        queryKey: adminLegalPageDetailQueryKey(slug),
      });
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, "Unable to discard draft."));
    },
  });
}

export function useRestoreLegalPageVersionMutation(slug: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ["admin", "legal-pages", slug, "restore"],
    mutationFn: (versionId: string) => restoreLegalPageVersion(slug, versionId),
    onSuccess: async () => {
      toast.success("Version restored to draft.");
      await queryClient.invalidateQueries({
        queryKey: adminLegalPageDetailQueryKey(slug),
      });
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, "Unable to restore version."));
    },
  });
}
