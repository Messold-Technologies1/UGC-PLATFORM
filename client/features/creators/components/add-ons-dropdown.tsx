import { memo } from "react";
import { ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import type { AddOn } from "../types";

interface AddOnsDropdownProps {
  addOns: AddOn[];
  selectedAddOnIds: string[];
  onToggleAddOn: (id: string) => void;
  disabled?: boolean;
}

export const AddOnsDropdown = memo(function AddOnsDropdown({
  addOns,
  selectedAddOnIds,
  onToggleAddOn,
  disabled = false,
}: AddOnsDropdownProps) {
  if (addOns.length === 0) {
    return null;
  }

  return (
    <div className="w-full">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            className="w-full justify-between font-normal text-left h-auto py-3"
            disabled={disabled}
          >
            <div className="flex flex-col items-start gap-1">
              <span className="font-medium text-sm">
                {selectedAddOnIds.length > 0
                  ? `${selectedAddOnIds.length} Add-on${
                      selectedAddOnIds.length > 1 ? "s" : ""
                    } selected`
                  : "Select Add-ons"}
              </span>
              <span className="text-xs text-muted-foreground">
                Optional extras for your order
              </span>
            </div>
            <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-[--radix-dropdown-menu-trigger-width] min-w-[280px]">
          <DropdownMenuLabel>Available Add-ons</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {addOns.map((addon) => {
            const isChecked = selectedAddOnIds.includes(addon.id);
            return (
              <DropdownMenuCheckboxItem
                key={addon.id}
                checked={isChecked}
                onCheckedChange={() => onToggleAddOn(addon.id)}
                className="py-3 items-start"
              >
                <div className="flex flex-col gap-1 ml-2">
                  <span className="font-medium leading-none">
                    {addon.label}{" "}
                    <span className="text-muted-foreground">
                      (+₹{addon.price.toLocaleString("en-IN")})
                    </span>
                  </span>
                  {addon.description && (
                    <span className="text-xs text-muted-foreground line-clamp-2 mt-1">
                      {addon.description}
                    </span>
                  )}
                  {addon.deliveryDays != null && (
                    <span className="text-xs font-medium text-primary mt-0.5">
                      Delivery in {addon.deliveryDays} day
                      {addon.deliveryDays === 1 ? "" : "s"}
                    </span>
                  )}
                </div>
              </DropdownMenuCheckboxItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
});
