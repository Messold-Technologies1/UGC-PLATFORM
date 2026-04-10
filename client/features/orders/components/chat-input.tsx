import { PlusCircle, Smile, Send } from "lucide-react";

export function ChatInput() {
  return (
    <div className="absolute inset-x-0 bottom-0 z-10 shrink-0 border-t border-border/10 bg-background/80 p-6 backdrop-blur-xl">
      <div className="relative flex items-center">
        <button className="absolute left-4 p-2 text-muted-foreground transition-colors hover:text-primary">
          <PlusCircle className="h-5 w-5" />
        </button>
        <input
          className="w-full rounded-2xl border border-border/30 bg-background py-4 pl-14 pr-24 text-sm text-foreground transition-all focus:border-primary/50 focus:outline-none focus:ring-4 focus:ring-primary/5"
          placeholder="Type your message to Ananya..."
          type="text"
        />
        <div className="absolute right-3 flex items-center gap-2">
          <button className="p-2 text-muted-foreground hover:text-foreground">
            <Smile className="h-5 w-5" />
          </button>
          <button className="rounded-xl bg-linear-to-r from-primary to-secondary p-2.5 font-bold text-primary-foreground transition-all active:scale-95">
            <Send className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
