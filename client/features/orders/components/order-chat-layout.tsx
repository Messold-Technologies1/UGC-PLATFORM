import { OrderChatHeader } from "./order-chat-header";
import { ChatMessages } from "./chat-messages";
import { ChatInput } from "./chat-input";
import { OrderDetailsSidebar } from "./order-details-sidebar";

export function OrderChatLayout() {
  return (
    <div className="flex flex-1 h-full w-full max-h-full min-h-0 overflow-hidden bg-background">
      <div className="flex min-w-0 flex-1 flex-col relative overflow-hidden">
        <OrderChatHeader />
        <ChatMessages />
        <ChatInput />
      </div>

      <OrderDetailsSidebar />
    </div>
  );
}
