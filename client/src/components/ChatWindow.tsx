import { useEffect, useRef } from "react";
import { type Message } from "@shared/schema";
import { ChatMessage } from "./ChatMessage";

interface ChatWindowProps {
  messages: Message[];
  isStreaming: boolean;
  streamingContent: string;
}

export function ChatWindow({ messages, isStreaming, streamingContent }: ChatWindowProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingContent]);

  return (
    <div
      className="flex-1 border-2 border-border bg-card overflow-y-auto p-6 shadow-md"
      style={{ boxShadow: "4px 4px 0px hsl(var(--border))" }}
      data-testid="chat-window"
    >
      {messages.length === 0 && !isStreaming && (
        <div className="h-full flex items-center justify-center">
          <div className="text-center opacity-60 max-w-md">
            <div className="text-6xl mb-4">▌</div>
            <div className="text-lg font-bold tracking-wider mb-2">[ READY TO CHAT ]</div>
            <div className="text-sm">
              Type your message below to start a conversation with Claude
            </div>
          </div>
        </div>
      )}

      {messages.map((message) => (
        <ChatMessage key={message.id} message={message} />
      ))}

      {isStreaming && (
        <div className="flex justify-start mb-6" data-testid="streaming-message">
          <div
            className="max-w-[85%] sm:max-w-[75%] border-2 border-border p-4 bg-card text-card-foreground shadow-md"
            style={{ boxShadow: "4px 4px 0px hsl(var(--border))" }}
          >
            <div className="flex items-center gap-2 mb-2 text-xs opacity-70 uppercase tracking-wider">
              <span>[ CLAUDE ]</span>
            </div>
            <div className="whitespace-pre-wrap break-words leading-relaxed">
              {streamingContent}
              <span className="inline-block animate-blink ml-1">▌</span>
            </div>
          </div>
        </div>
      )}

      <div ref={messagesEndRef} />
    </div>
  );
}
