"use client";

import Link from "next/link";
import { 
  Bell, 
  CheckCheck, 
  CheckCircle2, 
  Info, 
  AlertCircle, 
  AlertTriangle 
} from "lucide-react";

import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useNotification, type AppNotification } from "@/providers/notification-provider";

function timeAgo(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.round((now.getTime() - date.getTime()) / 1000);
  const minutes = Math.round(seconds / 60);
  const hours = Math.round(minutes / 60);
  const days = Math.round(hours / 24);

  if (seconds < 60) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
}

const NotificationIcon = ({ type }: { type: AppNotification["type"] }) => {
  switch (type) {
    case "success":
      return <CheckCircle2 className="size-4 text-emerald-500" />;
    case "warning":
      return <AlertTriangle className="size-4 text-amber-500" />;
    case "error":
      return <AlertCircle className="size-4 text-red-500" />;
    case "info":
    default:
      return <Info className="size-4 text-blue-500" />;
  }
};

export function NotificationDropdown() {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotification();

  return (
    <div className="group relative">
      <button
        className="relative flex items-center justify-center size-9 rounded-md transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label="Notifications"
      >
        <Bell className="size-5 text-muted-foreground" />
        {unreadCount > 0 && (
          <span className="absolute right-1 top-1 flex size-2 shrink-0 items-center justify-center rounded-full bg-red-500 ring-2 ring-background">
            <span className="sr-only">{unreadCount} unread notifications</span>
          </span>
        )}
      </button>
      
      <div className="absolute top-full right-0 sm:left-1/2 sm:-translate-x-1/2 sm:right-auto pt-4 pointer-events-none opacity-0 translate-y-2 group-hover:pointer-events-auto group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300 z-50">
        <div className="w-[340px] sm:w-[380px] rounded-[2rem] bg-[#f7f7f7] shadow-[0_4px_20px_rgba(0,0,0,0.05)] dark:bg-slate-950 border border-border/50 overflow-hidden flex flex-col">
          <div className="flex items-center justify-between px-6 py-4">
            <span className="font-semibold text-base text-foreground">Notifications</span>
            {unreadCount > 0 && (
              <button 
                className="flex items-center text-xs font-medium text-primary hover:underline focus:outline-none"
                onClick={(e) => {
                  e.preventDefault();
                  markAllAsRead();
                }}
              >
                <CheckCheck className="size-3.5 mr-1" />
                Mark all as read
              </button>
            )}
          </div>
          <div className="h-px bg-border/50 w-full" />
          
          <ScrollArea className="max-h-[400px]">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
                <div className="bg-muted size-10 rounded-full flex items-center justify-center mb-3">
                  <Bell className="size-5 text-muted-foreground/60" />
                </div>
                <p className="text-sm font-medium text-foreground">No notifications</p>
                <p className="text-xs text-muted-foreground mt-1">You&apos;re all caught up! New events will appear here.</p>
              </div>
            ) : (
              <div className="flex flex-col py-2">
                {notifications.map((notification) => {
                  const ItemContent = () => (
                    <div className="flex gap-3 items-start w-full">
                      <div className="mt-0.5 shrink-0">
                        <NotificationIcon type={notification.type} />
                      </div>
                      <div className="flex flex-col gap-1 w-full min-w-0">
                        <div className="flex items-start justify-between gap-2 w-full">
                          <span className="text-sm font-medium leading-none text-foreground">
                            {notification.title}
                          </span>
                          <span className="text-[10px] whitespace-nowrap text-muted-foreground shrink-0 mt-0.5">
                            {timeAgo(notification.createdAt)}
                          </span>
                        </div>
                        {notification.description && (
                          <p className="text-xs text-muted-foreground line-clamp-2 pr-4">
                            {notification.description}
                          </p>
                        )}
                      </div>
                      {!notification.isRead && (
                        <div className="shrink-0 size-1.5 rounded-full bg-primary mt-1.5" />
                      )}
                    </div>
                  );

                  const commonClasses = cn(
                    "flex px-6 py-3 transition-colors hover:bg-black/5 dark:hover:bg-white/5 outline-none items-start text-left",
                    !notification.isRead && "bg-black/5 dark:bg-white/5"
                  );

                  return notification.link ? (
                    <Link 
                      key={notification.id}
                      href={notification.link} 
                      className={commonClasses}
                      onClick={() => {
                        if (!notification.isRead) markAsRead(notification.id);
                      }}
                    >
                      <ItemContent />
                    </Link>
                  ) : (
                    <button
                      key={notification.id}
                      className={commonClasses}
                      onClick={() => {
                        if (!notification.isRead) markAsRead(notification.id);
                      }}
                    >
                      <ItemContent />
                    </button>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </div>
      </div>
    </div>
  );
}
