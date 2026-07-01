import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  listMySections,
  createSection,
  updateSection,
  deleteSection,
  reorderSections,
  addVideosToSection,
  removeVideoFromSection,
} from "../api/portfolio-sections";
import { toast } from "sonner";

export const PORTFOLIO_SECTIONS_QUERY_KEY = ["my-portfolio-sections"];

export function useMyPortfolioSectionsQuery() {
  return useQuery({
    queryKey: PORTFOLIO_SECTIONS_QUERY_KEY,
    queryFn: () => listMySections(),
  });
}

export function useCreatePortfolioSectionMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ name }: { name: string }) => createSection(name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PORTFOLIO_SECTIONS_QUERY_KEY });
      toast.success("Section created");
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || err.message;
      toast.error(`Failed to create section: ${msg}`);
    },
  });
}

export function useUpdatePortfolioSectionMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      name,
      position,
    }: {
      id: string;
      name?: string;
      position?: number;
    }) => updateSection(id, { name, position }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PORTFOLIO_SECTIONS_QUERY_KEY });
      toast.success("Section updated");
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || err.message;
      toast.error(`Failed to update section: ${msg}`);
    },
  });
}

export function useDeletePortfolioSectionMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: string }) => deleteSection(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PORTFOLIO_SECTIONS_QUERY_KEY });
      toast.success("Section deleted");
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || err.message;
      toast.error(`Failed to delete section: ${msg}`);
    },
  });
}

export function useReorderPortfolioSectionsMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (sections: { id: string; position: number }[]) =>
      reorderSections(sections),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PORTFOLIO_SECTIONS_QUERY_KEY });
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || err.message;
      toast.error(`Failed to reorder sections: ${msg}`);
    },
  });
}

export function useAddVideosToSectionMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      sectionId,
      videos,
    }: {
      sectionId: string;
      videos: { videoId: string; position?: number }[];
    }) => addVideosToSection(sectionId, videos),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PORTFOLIO_SECTIONS_QUERY_KEY });
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || err.message;
      toast.error(`Failed to add videos: ${msg}`);
    },
  });
}

export function useRemoveVideoFromSectionMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      sectionId,
      videoId,
    }: {
      sectionId: string;
      videoId: string;
    }) => removeVideoFromSection(sectionId, videoId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PORTFOLIO_SECTIONS_QUERY_KEY });
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || err.message;
      toast.error(`Failed to remove video: ${msg}`);
    },
  });
}
