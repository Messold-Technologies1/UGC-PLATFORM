"use client";

import { AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface ShippingAddressCardProps {
  creatorName: string;
}

export function ShippingAddressCard({ creatorName }: ShippingAddressCardProps) {
  // Static placeholder data since API doesn't support this yet
  const address = {
    name: creatorName || "Riya Sharma",
    line1: "A-102, Green Avenue",
    line2: "Saket, New Delhi - 110017",
    country: "India",
    phone: "+91 98765 43210",
  };

  return (
    <div className="rounded-2xl border bg-card shadow-sm">
      <div className="flex items-center justify-between px-6 pt-6 pb-4">
        <h3 className="text-lg font-bold text-foreground">Shipping Address</h3>
        <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400 pointer-events-none rounded-full px-2.5 py-0.5 text-[10px] font-semibold">
          Verified by creator
        </Badge>
      </div>

      <div className="px-6 pb-6 space-y-4">
        <div className="space-y-1">
          <p className="text-sm font-medium text-foreground">{address.name}</p>
          <p className="text-sm text-muted-foreground">{address.line1}</p>
          <p className="text-sm text-muted-foreground">{address.line2}</p>
          <p className="text-sm text-muted-foreground">{address.country}</p>
          <p className="text-sm text-muted-foreground mt-2">{address.phone}</p>
        </div>

        <div className="rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/50 p-4 mt-2">
          <div className="flex items-start gap-3">
            <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-400 mt-0.5">
              <AlertCircle className="size-4" />
            </div>
            <div>
              <p className="text-sm font-semibold text-amber-900 dark:text-amber-100">
                Important
              </p>
              <p className="text-sm text-amber-700 dark:text-amber-300 mt-0.5 leading-relaxed">
                Please ship the product to this address only. Any shipping cost will not be reimbursed.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
