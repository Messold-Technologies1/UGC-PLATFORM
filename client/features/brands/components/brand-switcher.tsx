"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ChevronDown, Store } from "lucide-react";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { switchAgencyBrand } from "@/features/agency/api/switch-agency-brand";
import {
  authMeQueryKey,
  type AuthUser,
  useMeQuery,
} from "@/features/auth/hooks/use-me-query";
import {
  resolveClientActiveBrandId,
  writeStoredActiveBrandId,
} from "@/features/brands/lib/active-brand";

function BrandChip({
  brandName,
  logoUrl,
}: {
  brandName: string | null;
  logoUrl: string | null;
}) {
  return (
    <div className="flex h-9 max-w-[14rem] items-center gap-2 rounded-md border border-border/60 bg-background/80 px-3 text-sm">
      {logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={logoUrl} alt="" className="size-5 rounded object-cover" />
      ) : (
        <Store className="size-4 shrink-0 text-muted-foreground" />
      )}
      <span className="truncate font-medium">{brandName ?? "Brand"}</span>
    </div>
  );
}

export function BrandSwitcher() {
  const queryClient = useQueryClient();
  const { data: user } = useMeQuery();
  const [switching, setSwitching] = useState(false);

  if (!user?.roles.includes("AGENCY") || user.accessibleBrands.length === 0) {
    return null;
  }

  const activeId = resolveClientActiveBrandId(user);

  if (user.accessibleBrands.length === 1) {
    const only = user.accessibleBrands[0]!;
    return <BrandChip brandName={only.brandName} logoUrl={only.logoUrl} />;
  }

  async function onChange(nextId: string) {
    if (!user || nextId === activeId) return;
    setSwitching(true);
    try {
      const result = await switchAgencyBrand(nextId);
      writeStoredActiveBrandId(user.id, result.activeBrandProfileId);
      queryClient.setQueryData<AuthUser | null>(authMeQueryKey, (prev) =>
        prev
          ? { ...prev, activeBrandProfileId: result.activeBrandProfileId }
          : prev,
      );
      await queryClient.invalidateQueries();
      toast.success(`Switched to ${result.brandName ?? "brand"}`);
    } catch {
      toast.error("Could not switch brand");
    } finally {
      setSwitching(false);
    }
  }

  return (
    <Select
      value={activeId ?? undefined}
      onValueChange={onChange}
      disabled={switching}
    >
      <SelectTrigger
        className="h-9 w-[min(100%,14rem)] gap-2 border-border/60 bg-background/80"
        aria-label="Active brand"
      >
        <Store className="size-4 shrink-0 text-muted-foreground" />
        <SelectValue placeholder="Select brand" />
        <ChevronDown className="size-4 opacity-50" />
      </SelectTrigger>
      <SelectContent align="end">
        {user.accessibleBrands.map((b) => (
          <SelectItem key={b.id} value={b.id}>
            {b.brandName ?? "Brand"}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
