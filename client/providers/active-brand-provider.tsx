"use client";

import { useQueryClient } from "@tanstack/react-query";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useSyncExternalStore,
} from "react";
import {
  getActiveBrandProfileId,
  getServerActiveBrandProfileId,
  setActiveBrandProfileId,
  subscribeToActiveBrandProfileId,
} from "@/lib/active-brand-context";

type ActiveBrandContextValue = {
  /** Null means the agency is in its own workspace. */
  activeBrandProfileId: string | null;
  switchToBrand: (brandProfileId: string | null) => void;
};

const ActiveBrandContext = createContext<ActiveBrandContextValue>({
  activeBrandProfileId: null,
  switchToBrand: () => {},
});

/**
 * React access to the active brand, over the plain module the axios
 * interceptor reads.
 *
 * `useSyncExternalStore` rather than state-plus-effect: the module is the
 * source of truth (the interceptor reads it synchronously on every request),
 * so React should subscribe to it, not keep a second copy in step.
 *
 * Switching clears the entire query cache rather than invalidating selected
 * keys. That is deliberate: nearly every buyer-side query — orders, wishlists,
 * briefs, credits, chats — answers differently per brand, and one stale list
 * rendered under the wrong brand's name is a worse failure than a brief
 * refetch. Clearing is the option that cannot leak.
 */
export function ActiveBrandProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const queryClient = useQueryClient();

  const activeBrandProfileId = useSyncExternalStore(
    subscribeToActiveBrandProfileId,
    getActiveBrandProfileId,
    getServerActiveBrandProfileId,
  );

  const switchToBrand = useCallback(
    (brandProfileId: string | null) => {
      if (brandProfileId === getActiveBrandProfileId()) return;
      setActiveBrandProfileId(brandProfileId);
      queryClient.clear();
    },
    [queryClient],
  );

  const value = useMemo(
    () => ({ activeBrandProfileId, switchToBrand }),
    [activeBrandProfileId, switchToBrand],
  );

  return (
    <ActiveBrandContext.Provider value={value}>
      {children}
    </ActiveBrandContext.Provider>
  );
}

export function useActiveBrand(): ActiveBrandContextValue {
  return useContext(ActiveBrandContext);
}
