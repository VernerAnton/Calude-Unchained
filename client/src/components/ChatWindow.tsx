import { useEffect, useRef } from "react";
import { type Message, type MessageFile } from "@shared/schema";
import { ChatMessage } from "./ChatMessage";
import { getSiblings, type BranchSelection } from "@/lib/messageTree";

interface ChatWindowProps {
  messages: Message[];
  activePath: Message[];
  allMessages: Message[];
  messageFiles: MessageFile[];
  branchSelections: BranchSelection;
  isStreaming: boolean;
  streamingContent: string;
  onEditMessage?: (messageId: number, newContent: string) => void;
  onRegenerateMessage?: (messageId: number) => void;
  onDeleteMessage?: (messageId: number) => void;
  onBranchNavigate?: (parentId: number | null, direction: "prev" | "next") => void;
  onOpenThread?: (messageId: number) => void;
}

export function ChatWindow({
  messages,
  activePath,
  allMessages,
  messageFiles,
  branchSelections,
  isStreaming,
  streamingContent,
  onEditMessage,
  onRegenerateMessage,
  onDeleteMessage,
  onBranchNavigate,
  onOpenThread
}: ChatWindowProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [activePath, streamingContent]);

  const displayMessages = activePath.length > 0 ? activePath : messages;

  return (
    <div
      className="flex-1 overflow-y-auto py-6"
      data-testid="chat-window"
    >
      {displayMessages.length === 0 && !isStreaming && (
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

      {displayMessages.map((message) => {
        const siblings = getSiblings(allMessages, message);
        const siblingIndex = siblings.findIndex(s => s.id === message.id);
        const files = messageFiles.filter(f => f.messageId === message.id);
        
        return (
          <ChatMessage 
            key={message.id} 
            message={message}
            files={files}
            siblings={siblings}
            siblingIndex={siblingIndex >= 0 ? siblingIndex : 0}
            onEdit={onEditMessage}
            onRegenerate={onRegenerateMessage}
            onDelete={onDeleteMessage}
            onBranchNavigate={onBranchNavigate}
            onOpenThread={onOpenThread}
          />
        );
      })}

      {isStreaming && (
        <div className="flex justify-start mb-4 px-4" data-testid="streaming-message">
          <div className="max-w-[75%] p-4">
            <div className="flex items-center gap-2 mb-2 text-xs font-semibold uppercase tracking-wider">
              <span>Claude</span>
            </div>
            <div className="whitespace-pre-wrap break-words leading-relaxed">
              {streamingContent}
              {isStreaming && (
                <span className="inline-block animate-blink ml-1">▌</span>
              )}
            </div>
          </div>
        </div>
      )}

      <div ref={messagesEndRef} />
    </div>
  );
}
