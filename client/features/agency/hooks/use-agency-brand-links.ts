"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  acceptBrandLink,
  cancelAgencyLinkRequest,
  fetchAgencyBrandLinks,
  fetchAgencyPartnerId,
  fetchBrandAgencyLinks,
  leaveBrandLink,
  rejectBrandLink,
  requestAgencyLink,
  revokeAgencyLink,
  rotateAgencyPartnerId,
  type BrandCompletenessGap,
} from "@/features/agency/api/agency-brand-links";

export const agencyPartnerIdQueryKey = ["agency", "partner-id"] as const;
export const agencyBrandLinksQueryKey = ["agency", "brand-links"] as const;
export const brandAgencyLinksQueryKey = ["brand", "agency-links"] as const;

/** The code the agency hands to brands. */
export function useAgencyPartnerIdQuery(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: agencyPartnerIdQueryKey,
    queryFn: fetchAgencyPartnerId,
    enabled: options?.enabled ?? true,
    staleTime: 5 * 60_000,
    retry: false,
  });
}

/** Brands this agency manages, plus requests waiting on it. */
export function useAgencyBrandLinksQuery(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: agencyBrandLinksQueryKey,
    queryFn: fetchAgencyBrandLinks,
    enabled: options?.enabled ?? true,
    staleTime: 60_000,
    retry: false,
  });
}

/** Agencies managing this brand, plus what the profile still needs. */
export function useBrandAgencyLinksQuery(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: brandAgencyLinksQueryKey,
    queryFn: fetchBrandAgencyLinks,
    enabled: options?.enabled ?? true,
    staleTime: 60_000,
    retry: false,
  });
}

/**
 * Pull the completeness gaps out of a 422 so the form can name what is
 * missing. Anything else is reported as-is.
 */
function describeLinkError(error: unknown): {
  message: string;
  gaps: BrandCompletenessGap[];
} {
  const response = (
    error as {
      response?: {
        status?: number;
        data?: { message?: string; gaps?: BrandCompletenessGap[] };
      };
    }
  )?.response;

  if (response?.status === 422 && response.data?.gaps?.length) {
    return {
      message:
        response.data.message ??
        "Complete your brand profile before connecting an agency",
      gaps: response.data.gaps,
    };
  }

  return {
    message:
      response?.data?.message ?? "Something went wrong. Please try again.",
    gaps: [],
  };
}

export function useRequestAgencyLinkMutation(options?: {
  onGaps?: (gaps: BrandCompletenessGap[]) => void;
}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (partnerId: string) => requestAgencyLink(partnerId),
    onSuccess: (result) => {
      toast.success(`Request sent to ${result.agencyName}`, {
        description: "They'll get an email and can accept from their dashboard.",
      });
      void queryClient.invalidateQueries({ queryKey: brandAgencyLinksQueryKey });
    },
    onError: (error) => {
      const { message, gaps } = describeLinkError(error);
      if (gaps.length) options?.onGaps?.(gaps);
      toast.error(message);
    },
  });
}

export function useCancelAgencyLinkMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => cancelAgencyLinkRequest(id),
    onSuccess: () => {
      toast.success("Request withdrawn");
      void queryClient.invalidateQueries({ queryKey: brandAgencyLinksQueryKey });
    },
    onError: (error) => toast.error(describeLinkError(error).message),
  });
}

export function useRevokeAgencyLinkMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      revokeAgencyLink(id, reason),
    onSuccess: () => {
      toast.success("Agency access ended", {
        description: "Your orders and briefs are unaffected.",
      });
      void queryClient.invalidateQueries({ queryKey: brandAgencyLinksQueryKey });
    },
    onError: (error) => toast.error(describeLinkError(error).message),
  });
}

export function useAcceptBrandLinkMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => acceptBrandLink(id),
    onSuccess: () => {
      toast.success("Brand connected", {
        description: "Switch to them from the brand picker to start working.",
      });
      void queryClient.invalidateQueries({ queryKey: agencyBrandLinksQueryKey });
    },
    onError: (error) => toast.error(describeLinkError(error).message),
  });
}

export function useRejectBrandLinkMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => rejectBrandLink(id),
    onSuccess: () => {
      toast.success("Request declined");
      void queryClient.invalidateQueries({ queryKey: agencyBrandLinksQueryKey });
    },
    onError: (error) => toast.error(describeLinkError(error).message),
  });
}

export function useLeaveBrandLinkMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => leaveBrandLink(id),
    onSuccess: () => {
      toast.success("You've stopped managing this brand");
      void queryClient.invalidateQueries({ queryKey: agencyBrandLinksQueryKey });
    },
    onError: (error) => toast.error(describeLinkError(error).message),
  });
}

export function useRotatePartnerIdMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: rotateAgencyPartnerId,
    onSuccess: () => {
      toast.success("New Partner ID generated", {
        description: "Brands you already manage keep their access.",
      });
      void queryClient.invalidateQueries({ queryKey: agencyPartnerIdQueryKey });
    },
    onError: (error) => toast.error(describeLinkError(error).message),
  });
}
