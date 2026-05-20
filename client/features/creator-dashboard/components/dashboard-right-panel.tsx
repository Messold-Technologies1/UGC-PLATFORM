"use client";

import { Star, ArrowRight, CheckCircle2, Circle } from "lucide-react";
import { cn } from "@/lib/utils";
import { BrandAvatar, StatGrid } from "@/features/creator-ui";
import type {
  DashboardData,
  DashboardMessage,
  DashboardTask,
} from "../mock/dashboard-mock-data";

interface Props {
  creator: DashboardData["creator"];
  messages: DashboardMessage[];
  tasks: DashboardTask[];
}

export function DashboardRightPanel({ creator, messages, tasks }: Props) {
  return (
    <div className="flex flex-col gap-5">
      {/* Creator profile card */}
      <div className="rounded-2xl border border-border bg-card p-5">
        <div className="flex flex-col items-center text-center gap-3">
          <div className="relative">
            <div className="size-16 rounded-2xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center text-primary-foreground text-xl font-bold">
              {creator.displayName.split(" ").map((n) => n[0]).join("")}
            </div>
            {creator.isVerified && (
              <div className="absolute -bottom-1 -right-1 size-5 bg-primary rounded-full flex items-center justify-center">
                <CheckCircle2 className="size-3 text-primary-foreground" />
              </div>
            )}
          </div>
          <div>
            <p className="font-bold text-foreground">{creator.displayName}</p>
            {creator.isTopCreator && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-500/10 text-amber-600 border border-amber-500/20 rounded-full text-xs font-semibold mt-1">
                <Star className="size-3 fill-amber-500 text-amber-500" />
                Top Creator
              </span>
            )}
          </div>
          <div className="flex items-center gap-1 text-sm">
            <Star className="size-3.5 fill-amber-400 text-amber-400" />
            <span className="font-bold text-foreground">{creator.rating}</span>
            <span className="text-muted-foreground">({creator.reviewCount} reviews)</span>
          </div>
        </div>
        <StatGrid
          cols={2}
          className="mt-4"
          items={[
            { label: "Response Rate", value: `${creator.responseRate}%` },
            { label: "On-time Delivery", value: `${creator.onTimeRate}%` },
          ]}
        />
      </div>

      {/* Recent Messages */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="font-bold text-foreground">Recent Messages</h2>
          <a
            href="/creator/messages"
            className="text-xs text-primary font-semibold hover:underline flex items-center gap-1"
          >
            View all <ArrowRight className="size-3" />
          </a>
        </div>
        <div className="divide-y divide-border">
          {messages.map((msg, i) => (
            <div
              key={i}
              className="flex items-center gap-3 px-5 py-3 hover:bg-accent/30 transition-colors cursor-pointer"
            >
              <BrandAvatar initials={msg.brandInitials} bgClass={msg.brandBgClass} size="md" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-foreground truncate">{msg.brandName}</p>
                  <span className="text-[11px] text-muted-foreground whitespace-nowrap shrink-0">{msg.time}</span>
                </div>
                <p className="text-xs text-muted-foreground truncate mt-0.5">{msg.preview}</p>
              </div>
              {msg.unread > 0 && (
                <span className="size-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center shrink-0">
                  {msg.unread}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Tasks */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <h2 className="font-bold text-foreground">Tasks</h2>
        </div>
        <div className="p-4 flex flex-col gap-3">
          {tasks.map((task, i) => (
            <div key={i} className="flex items-start gap-3">
              {task.done ? (
                <CheckCircle2 className="size-4 text-emerald-500 mt-0.5 shrink-0" />
              ) : (
                <Circle className="size-4 text-muted-foreground mt-0.5 shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className={cn("text-sm font-medium", task.done ? "line-through text-muted-foreground" : "text-foreground")}>
                  {task.label}
                </p>
                <p className={cn("text-xs mt-0.5", task.urgent ? "text-red-500 font-semibold" : "text-muted-foreground")}>
                  {task.dueLabel}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
