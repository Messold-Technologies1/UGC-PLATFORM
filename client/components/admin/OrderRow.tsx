import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { AdminOrderListItemDto } from "@/features/admin/types";
import { STATUS_COLORS, STATUS_LABELS } from "@/features/orders/constants";

interface OrderRowProps extends AdminOrderListItemDto {
  delay?: number;
}

function initials(value: string) {
  return value
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function formatMoney(amount: string, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency || "USD",
  }).format(Number.parseFloat(amount) || 0);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

export default function OrderRow({ order, creator, brand, delay = 0 }: OrderRowProps) {
  const statusClass =
    STATUS_COLORS[order.status] ?? "bg-muted text-muted-foreground border-border";
  const statusLabel =
    STATUS_LABELS[order.status] ?? order.status.replaceAll("_", " ");

  return (
    <tr
      className="hover:bg-muted/50 hover:scale-[1.005] transition-all duration-300 ease-in-out group reveal-item"
      style={{ animationDelay: `${delay}ms` }}
    >
      <td className="px-8 py-6">
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-4">
            <div className="relative">
              <Avatar className="w-12 h-12 rounded-full ring-2 ring-primary/20">
                <AvatarImage
                  alt={creator.displayName}
                  className="object-cover"
                  src={creator.profileImageUrl || undefined}
                />
                <AvatarFallback className="bg-primary/5 text-primary text-xs font-bold">
                  {initials(creator.displayName)}
                </AvatarFallback>
              </Avatar>
              {order.status === "DELIVERED" && (
                <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border-2 border-background animate-pulse"></div>
              )}
            </div>
            <div className="w-px h-8 bg-linear-to-b from-transparent via-border/40 to-transparent self-center"></div>
            <div className="p-1 bg-accent/20 rounded-lg border border-border/10">
              <Avatar className="w-10 h-10 rounded-md">
                <AvatarImage
                  alt={brand.companyName}
                  className="object-cover"
                  src={brand.logoUrl || undefined}
                />
                <AvatarFallback className="rounded-md bg-secondary/10 text-secondary text-xs font-bold">
                  {initials(brand.companyName)}
                </AvatarFallback>
              </Avatar>
            </div>
          </div>
          <div className="flex gap-4">
            <div className="w-12">
              <p className="font-bold text-foreground text-xs leading-tight">
                {creator.displayName}
              </p>
              <p className="text-[10px] text-muted-foreground">
                {creator.city ?? "Remote"}
              </p>
            </div>
            <div className="w-px h-6 bg-border/20 self-center"></div>
            <div>
              <p className="font-bold text-muted-foreground text-xs leading-tight">
                {brand.companyName}
              </p>
              <p className="text-[10px] text-muted-foreground/60">Brand</p>
            </div>
          </div>
        </div>
      </td>
      <td className="px-8 py-6">
        <p className="font-bold text-sm text-foreground">
          {order.packageNameSnapshot}
        </p>
        <p className="text-[10px] text-primary/60 mt-1 font-semibold uppercase">
          {formatDate(order.createdAt)}
        </p>
      </td>
      <td className="px-8 py-6">
        <div className="flex flex-col">
          <span className="text-sm font-bold text-foreground">
            {formatMoney(order.priceAmountSnapshot, order.currency)}
          </span>
          <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-tighter">
            {order.currency} / {order.deliveryDaysSnapshot} days
          </span>
        </div>
      </td>
      <td className="px-8 py-6">
        <Badge
          variant="outline"
          className={`${statusClass} px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest`}
        >
          {statusLabel}
        </Badge>
      </td>
      <td className="px-8 py-6 text-right">
        <div className="flex items-center justify-end gap-2">
          <Link
            href={`/admin/orderManagement/${order.id}`}
            className="p-2 hover:bg-primary/10 rounded-lg text-muted-foreground hover:text-primary transition-all bg-primary/5 shadow-sm"
            title="Quick View"
          >
            <span className="material-symbols-outlined text-[20px]">
              arrow_forward
            </span>
          </Link>
          {/* <Link
            href={`/admin/orderManagement/${order.id}`}
            className="p-2 hover:bg-primary/10 rounded-lg text-muted-foreground hover:text-primary transition-all"
            title="Edit"
          >
            <span className="material-symbols-outlined text-[20px]">edit</span>
          </Link> */}
          {/* <Link
            href={`/admin/orderManagement/${order.id}`}
            className="p-2 hover:bg-primary/10 rounded-lg text-muted-foreground hover:text-primary transition-all"
            title="Messages"
          >
            <span className="material-symbols-outlined text-[20px]">
              chat_bubble
            </span>
          </Link> */}
        </div>
      </td>
    </tr>
  );
}
