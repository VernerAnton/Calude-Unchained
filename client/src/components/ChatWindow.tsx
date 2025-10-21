import { useEffect, useRef } from "react";
import { type Message } from "@shared/schema";
import { ChatMessage } from "./ChatMessage";

interface ChatWindowProps {
  messages: Message[];
  isStreaming: boolean;
  streamingContent: string;
  onEditMessage?: (messageId: number, newContent: string) => void;
  onRegenerateMessage?: (messageId: number) => void;
  onDeleteMessage?: (messageId: number) => void;
}

export function ChatWindow({ 
  messages, 
  isStreaming, 
  streamingContent,
  onEditMessage,
  onRegenerateMessage,
  onDeleteMessage
}: ChatWindowProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingContent]);

  return (
    <div
      className="flex-1 overflow-y-auto py-6"
      data-testid="chat-window"
    >
      {messages.length === 0 && !isStreaming && (
        <div className="h-full flex items-center justify-center py-20">
          <div className="text-center text-muted-foreground max-w-md">
            <div className="text-4xl mb-4">💬</div>
            <div className="text-lg font-semibold mb-2">Ready to chat</div>
            <div className="text-sm">
              Start a conversation with Claude
            </div>
          </div>
        </div>
      )}

      {messages.map((message) => (
        <ChatMessage 
          key={message.id} 
          message={message}
          onEdit={onEditMessage}
          onRegenerate={onRegenerateMessage}
          onDelete={onDeleteMessage}
        />
      ))}

      {isStreaming && (
        <div className="flex justify-start mb-4 px-4" data-testid="streaming-message">
          <div className="max-w-[75%] p-4 bg-muted">
            <div className="flex items-center gap-2 mb-2 text-xs font-semibold uppercase tracking-wider">
              <span>Claude</span>
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
