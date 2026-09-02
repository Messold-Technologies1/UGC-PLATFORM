import { useMutation, useQueryClient } from "@tanstack/react-query";
import { approveCreator } from "../api/approve-creator";

import { toast } from "sonner";
import { isAxiosError } from "axios";
import { isProfileFirstOnboardingMode } from "@/features/auth/lib/creator-onboarding-mode";

function invalidateAdminCreatorLists(queryClient: ReturnType<typeof useQueryClient>) {
  void queryClient.invalidateQueries({ queryKey: ["admin", "creators"] });
  void queryClient.invalidateQueries({
    queryKey: ["admin", "creators", "segment-counts"],
  });
  void queryClient.invalidateQueries({
    queryKey: ["admin", "pending-approvals"],
  });
  void queryClient.invalidateQueries({
    queryKey: ["admin", "rejected-approvals"],
  });
  void queryClient.invalidateQueries({ queryKey: ["creators", "list"] });
}

export function useApproveCreatorMutation() {
  const queryClient = useQueryClient();
  const profileFirst = isProfileFirstOnboardingMode();

  return useMutation({
    mutationFn: approveCreator,
    onSuccess: () => {
      toast.success(
        profileFirst ? "Creator listed successfully" : "Creator approved successfully",
      );
    },
    onError: (err) => {
      if (isAxiosError(err) && err.response?.data?.message) {
        toast.error(
          profileFirst
            ? `Listing failed: ${err.response.data.message}`
            : `Approval failed: ${err.response.data.message}`,
        );
      } else {
        toast.error(
          profileFirst
            ? "An error occurred while listing this creator"
            : "An error occurred during approval",
        );
      }
    },
    onSettled: () => {
      invalidateAdminCreatorLists(queryClient);
    },
  });
}
