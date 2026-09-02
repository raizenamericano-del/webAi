import { Suspense } from "react";
import { ChatApp } from "@/components/chat/chat-app";
import { Loader2 } from "lucide-react";

export const metadata = { title: "AI Chat — Neural AI Studio" };

export default function ChatPage() {
  return (
    <Suspense
      fallback={
        <div className="grid h-[calc(100vh-3.5rem)] place-items-center">
          <Loader2 className="h-6 w-6 animate-spin text-neon-cyan" />
        </div>
      }
    >
      <ChatApp />
    </Suspense>
  );
}
