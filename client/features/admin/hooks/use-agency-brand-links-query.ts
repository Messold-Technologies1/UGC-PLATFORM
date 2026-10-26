"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  fetchAgencyBrandLinks,
  forceUnlinkAgencyBrand,
} from "../api/fetch-agency-brand-links";

export const agencyBrandLinksQueryKey = (params?: {
  agencyId?: string;
  brandId?: string;
}) => ["admin", "agency-brand-links", params] as const;

export function useAgencyBrandLinksQuery(params?: {
  agencyId?: string;
  brandId?: string;
}) {
  return useQuery({
    queryKey: agencyBrandLinksQueryKey(params),
    queryFn: () => fetchAgencyBrandLinks(params),
    staleTime: 60_000,
  });
}

export function useForceUnlinkMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      forceUnlinkAgencyBrand(id, reason),
    onSuccess: () => {
      toast.success("Link ended", {
        description: "The brand keeps every order the agency placed.",
      });
      void queryClient.invalidateQueries({
        queryKey: ["admin", "agency-brand-links"],
      });
    },
    onError: () => toast.error("Could not end the link. Please try again."),
  });
}
