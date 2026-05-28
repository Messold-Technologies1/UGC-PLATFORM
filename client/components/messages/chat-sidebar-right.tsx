import { CheckCircle2, XCircle, Lock, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ChatSidebarRight() {
  return (
    <div className="w-[300px] shrink-0 border border-border rounded-lg shadow-sm bg-background h-full overflow-y-auto p-6 hidden xl:block">
      <div className="space-y-8">
        <div>
          <h3 className="font-semibold text-sm mb-2 text-foreground">
            Chat Availability & States
          </h3>
          <p className="text-xs text-muted-foreground mb-6 leading-relaxed">
            Chat is enabled only during active stages of the order. Once the
            order is Completed or Cancelled, the chat is locked.
          </p>

          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle2 className="size-4 text-emerald-500" />
                <span className="text-sm font-medium text-foreground">
                  Chat is{" "}
                  <strong className="text-emerald-500 font-bold">
                    ENABLED
                  </strong>{" "}
                  during:
                </span>
              </div>
              <ul className="space-y-2 text-xs text-muted-foreground">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="size-3 text-emerald-500" /> Accepted
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="size-3 text-emerald-500" /> Awaiting
                  Shipment
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="size-3 text-emerald-500" /> In
                  Progress
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="size-3 text-emerald-500" /> Revision
                  Requested
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="size-3 text-emerald-500" /> Delivered
                </li>
              </ul>
              <div className="relative mt-4 mb-2 opacity-50 pointer-events-none">
                <input
                  type="text"
                  placeholder="Type a message..."
                  className="w-full bg-background border border-border rounded-full py-2 px-4 text-xs h-9 pr-20"
                  disabled
                />
                <div className="absolute right-1 top-1/2 -translate-y-1/2 flex gap-1">
                  <div className="size-7 rounded-full flex items-center justify-center bg-transparent">
                    <span className="text-lg">😊</span>
                  </div>
                  <div className="size-7 rounded-full bg-indigo-600 flex items-center justify-center text-white">
                    <span className="text-xs">➤</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-border/50 space-y-2">
              <div className="flex items-center gap-2 mb-3">
                <Lock className="size-4 text-red-500" />
                <span className="text-sm font-medium text-foreground">
                  Chat is{" "}
                  <strong className="text-red-500 font-bold">LOCKED</strong>{" "}
                  during:
                </span>
              </div>
              <ul className="space-y-2 text-xs text-muted-foreground">
                <li className="flex items-center gap-2">
                  <XCircle className="size-3 text-red-500" /> Completed
                </li>
                <li className="flex items-center gap-2">
                  <XCircle className="size-3 text-red-500" /> Cancelled
                </li>
                <li className="flex items-center gap-2">
                  <XCircle className="size-3 text-red-500" /> Expired
                </li>
                <li className="flex items-center gap-2">
                  <XCircle className="size-3 text-red-500" /> Refunded
                </li>
              </ul>
              <div className="mt-4 bg-muted/50 border border-border rounded-lg py-2 px-3 flex items-center gap-2 text-muted-foreground opacity-70">
                <Lock className="size-3" />
                <span className="text-xs">Messaging unavailable</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-purple-50 dark:bg-purple-950/20 rounded-xl p-4 border border-purple-100 dark:border-purple-900/50">
          <h4 className="font-semibold text-sm mb-3 text-purple-900 dark:text-purple-200">
            Why we do this?
          </h4>
          <ul className="space-y-2 text-xs text-purple-800/80 dark:text-purple-300/80 list-disc list-inside">
            <li>Protects creators & brands from sharing contact details.</li>
            <li>Ensures all communication stays on platform.</li>
            <li>Prevents off-platform deals.</li>
            <li>Keeps conversations for reference & support.</li>
          </ul>
        </div>

        <div>
          <h4 className="font-semibold text-sm mb-1 text-foreground">
            Admin Override{" "}
            <span className="text-muted-foreground font-normal">
              (Support Only)
            </span>
          </h4>
          <p className="text-xs text-muted-foreground mb-3 leading-relaxed">
            Our support team can reopen the conversation if there is any issue
            related to the order.
          </p>
          <Button
            variant="outline"
            size="sm"
            className="w-full text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-900/50 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 hover:text-indigo-700 dark:hover:text-indigo-300"
          >
            Contact Support
          </Button>
        </div>
      </div>
    </div>
  );
}
