import { useEffect, useRef, useCallback, useMemo } from "react";
import { type Message, type MessageFile } from "@shared/schema";
import { ChatMessage } from "./ChatMessage";
import { getSiblings, type BranchSelection } from "@/lib/messageTree";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface ChatWindowProps {
  messages: Message[];
  activePath: Message[];
  allMessages: Message[];
  messageFiles: MessageFile[];
  branchSelections: BranchSelection;
  isStreaming: boolean;
  streamingContent: string;
  pendingUserMessage?: string | null;
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
  pendingUserMessage,
  onEditMessage,
  onRegenerateMessage,
  onDeleteMessage,
  onBranchNavigate,
  onOpenThread
}: ChatWindowProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const lastMessageCountRef = useRef(0);
  const wasStreamingRef = useRef(false);

  const scrollToBottom = useCallback((smooth: boolean = true) => {
    if (smooth) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    } else {
      messagesEndRef.current?.scrollIntoView({ behavior: "auto" });
    }
  }, []);

  useEffect(() => {
    const currentMessageCount = activePath.length;
    const hasNewMessage = currentMessageCount > lastMessageCountRef.current;
    
    if (hasNewMessage && !isStreaming) {
      scrollToBottom(true);
    }
    
    lastMessageCountRef.current = currentMessageCount;
  }, [activePath.length, isStreaming, scrollToBottom]);

  useEffect(() => {
    if (isStreaming && streamingContent) {
      scrollToBottom(false);
    }
    
    if (wasStreamingRef.current && !isStreaming) {
      scrollToBottom(true);
    }
    
    wasStreamingRef.current = isStreaming;
  }, [isStreaming, streamingContent, scrollToBottom]);

  const displayMessages = activePath.length > 0 ? activePath : messages;

  const siblingsMap = useMemo(() => {
    const map = new Map<number, { siblings: Message[]; index: number }>();
    for (const message of displayMessages) {
      const siblings = getSiblings(allMessages, message);
      const index = siblings.findIndex(s => s.id === message.id);
      map.set(message.id, { siblings, index: index >= 0 ? index : 0 });
    }
    return map;
  }, [displayMessages, allMessages]);

  const filesMap = useMemo(() => {
    const map = new Map<number, MessageFile[]>();
    for (const file of messageFiles) {
      const existing = map.get(file.messageId) || [];
      existing.push(file);
      map.set(file.messageId, existing);
    }
    return map;
  }, [messageFiles]);

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
        const siblingData = siblingsMap.get(message.id) || { siblings: [], index: 0 };
        const files = filesMap.get(message.id) || [];
        
        return (
          <ChatMessage 
            key={message.id} 
            message={message}
            files={files}
            siblings={siblingData.siblings}
            siblingIndex={siblingData.index}
            onEdit={onEditMessage}
            onRegenerate={onRegenerateMessage}
            onDelete={onDeleteMessage}
            onBranchNavigate={onBranchNavigate}
            onOpenThread={onOpenThread}
          />
        );
      })}

      {pendingUserMessage && (
        <div className="flex justify-end mb-4 px-4" data-testid="pending-user-message">
          <div className="max-w-[75%] p-4">
            <div className="flex items-center gap-2 mb-2 text-xs font-semibold uppercase tracking-wider justify-end">
              <span>You</span>
            </div>
            <div className="whitespace-pre-wrap break-words leading-relaxed text-right">
              {pendingUserMessage}
            </div>
          </div>
        </div>
      )}

      {isStreaming && (
        <div className="flex justify-start mb-4 px-4" data-testid="streaming-message">
          <div className="max-w-[75%] p-4">
            <div className="flex items-center gap-2 mb-2 text-xs font-semibold uppercase tracking-wider">
              <span>Claude</span>
            </div>
            <div className="break-words leading-relaxed prose prose-sm dark:prose-invert max-w-none prose-headings:font-mono prose-headings:uppercase prose-headings:tracking-wider prose-code:before:content-none prose-code:after:content-none prose-code:bg-muted prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-pre:bg-muted prose-pre:border-2 prose-pre:border-border">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {streamingContent}
              </ReactMarkdown>
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
