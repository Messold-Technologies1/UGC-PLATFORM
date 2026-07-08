import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  disconnectSocial,
  fetchSocialConnections,
  getInstagramConnectUrl,
  socialConnectionsQueryKey,
  type SocialPlatformApi,
} from "../api/social-connections";

export function useSocialConnectionsQuery(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: socialConnectionsQueryKey,
    queryFn: fetchSocialConnections,
    enabled: options?.enabled,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });
}

/**
 * Starts the Instagram connect flow: fetches the authorize URL (authenticated,
 * so the access token refreshes and the OAuth state cookie is set) and then
 * navigates the browser to Instagram. The callback returns to the profile page.
 */
export function useConnectInstagramMutation() {
  return useMutation({
    mutationFn: getInstagramConnectUrl,
    onSuccess: (url) => {
      window.location.href = url;
    },
    onError: (error) => {
      toast.error(
        error instanceof Error
          ? error.message
          : "Could not start Instagram connection.",
      );
    },
  });
}

export function useDisconnectSocialMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (platform: SocialPlatformApi) => disconnectSocial(platform),
    onSuccess: () => {
      toast.success("Account disconnected.");
      queryClient.invalidateQueries({ queryKey: socialConnectionsQueryKey });
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Failed to disconnect account.",
      );
    },
  });
}
