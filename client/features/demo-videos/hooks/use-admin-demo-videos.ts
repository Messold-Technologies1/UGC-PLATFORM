import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  createDemoVideo,
  deleteDemoVideo,
  fetchAdminDemoVideos,
  updateDemoVideo,
} from "../api/admin-demo-videos";
import { demoIntroVideosQueryKey } from "./use-demo-intro-videos-query";
import type { CreateDemoVideoInput, UpdateDemoVideoInput } from "../types";

export const adminDemoVideosQueryKey = ["admin", "demo-intro-videos"] as const;

export function useAdminDemoVideosQuery() {
  return useQuery({
    queryKey: adminDemoVideosQueryKey,
    queryFn: fetchAdminDemoVideos,
    staleTime: 15_000,
  });
}

function useInvalidateDemoVideos() {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: adminDemoVideosQueryKey }),
      queryClient.invalidateQueries({ queryKey: demoIntroVideosQueryKey }),
    ]);
}

export function useCreateDemoVideoMutation() {
  const invalidate = useInvalidateDemoVideos();
  return useMutation({
    mutationFn: (payload: CreateDemoVideoInput) => createDemoVideo(payload),
    onSuccess: async () => {
      await invalidate();
      toast.success("Example video added");
    },
    onError: () => toast.error("Could not add example video. Try again."),
  });
}

export function useUpdateDemoVideoMutation() {
  const invalidate = useInvalidateDemoVideos();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateDemoVideoInput }) =>
      updateDemoVideo(id, payload),
    onSuccess: async () => {
      await invalidate();
      toast.success("Example video updated");
    },
    onError: () => toast.error("Could not update example video. Try again."),
  });
}

export function useDeleteDemoVideoMutation() {
  const invalidate = useInvalidateDemoVideos();
  return useMutation({
    mutationFn: (id: string) => deleteDemoVideo(id),
    onSuccess: async () => {
      await invalidate();
      toast.success("Example video deleted");
    },
    onError: () => toast.error("Could not delete example video. Try again."),
  });
}
