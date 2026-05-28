import {
  Shield,
  MessageSquare,
  Users,
  ShieldCheck,
  Lock,
  FileText,
  AlertCircle,
} from "lucide-react";

export function ChatRulesFooter() {
  return (
    <div className="flex flex-col lg:flex-row gap-6 w-full">
      <div className="flex-[4] flex flex-col">
        <h3 className="font-semibold text-sm mb-3 text-foreground">
          Important Chat Rules
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 h-full">
          <div className="bg-background border border-border rounded-lg p-4 flex gap-3 items-start shadow-sm">
            <div className="flex shrink-0 items-center justify-center size-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400">
              <Shield className="size-4" />
            </div>
            <div>
              <h4 className="text-xs font-semibold mb-1">
                1. Stay on Platform
              </h4>
              <p className="text-[10px] text-muted-foreground leading-relaxed">
                Please keep all communication on LetsCollab. Sharing contact
                details is not allowed.
              </p>
            </div>
          </div>
          <div className="bg-background border border-border rounded-lg p-4 flex gap-3 items-start shadow-sm">
            <div className="flex shrink-0 items-center justify-center size-8 rounded-lg bg-orange-50 dark:bg-orange-950/50 text-orange-600 dark:text-orange-400">
              <MessageSquare className="size-4" />
            </div>
            <div>
              <h4 className="text-xs font-semibold mb-1">2. Be Professional</h4>
              <p className="text-[10px] text-muted-foreground leading-relaxed">
                Be respectful and professional in all conversations.
              </p>
            </div>
          </div>
          <div className="bg-background border border-border rounded-lg p-4 flex gap-3 items-start shadow-sm">
            <div className="flex shrink-0 items-center justify-center size-8 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400">
              <Users className="size-4" />
            </div>
            <div>
              <h4 className="text-xs font-semibold mb-1">
                3. No External Deals
              </h4>
              <p className="text-[10px] text-muted-foreground leading-relaxed">
                All payments and deals must happen through LetsCollab only.
              </p>
            </div>
          </div>
          <div className="bg-background border border-border rounded-lg p-4 flex gap-3 items-start shadow-sm">
            <div className="flex shrink-0 items-center justify-center size-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400">
              <ShieldCheck className="size-4" />
            </div>
            <div>
              <h4 className="text-xs font-semibold mb-1">
                4. Support & Safety
              </h4>
              <p className="text-[10px] text-muted-foreground leading-relaxed">
                Our team is here to help if you face any issues.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-[3] flex flex-col">
        <h3 className="font-semibold text-sm mb-3 text-foreground">
          After Completion or Cancellation
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 h-full">
          <div className="bg-background border border-border rounded-lg p-4 flex gap-3 items-start shadow-sm">
            <div className="flex shrink-0 items-center justify-center size-8 rounded-lg bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400">
              <Lock className="size-4" />
            </div>
            <div>
              <h4 className="text-xs font-semibold mb-1">Chat is Locked</h4>
              <p className="text-[10px] text-muted-foreground leading-relaxed">
                You can view the full conversation history but cannot send new
                messages.
              </p>
            </div>
          </div>
          <div className="bg-background border border-border rounded-lg p-4 flex gap-3 items-start shadow-sm">
            <div className="flex shrink-0 items-center justify-center size-8 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400">
              <FileText className="size-4" />
            </div>
            <div>
              <h4 className="text-xs font-semibold mb-1">Files & Documents</h4>
              <p className="text-[10px] text-muted-foreground leading-relaxed">
                All files, deliveries and documents will remain accessible in
                the order details.
              </p>
            </div>
          </div>
          <div className="bg-background border border-border rounded-lg p-4 flex gap-3 items-start shadow-sm">
            <div className="flex shrink-0 items-center justify-center size-8 rounded-lg bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400">
              <AlertCircle className="size-4" />
            </div>
            <div>
              <h4 className="text-xs font-semibold mb-1">Need Help?</h4>
              <p className="text-[10px] text-muted-foreground leading-relaxed">
                If you need further assistance, please contact our support team.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
