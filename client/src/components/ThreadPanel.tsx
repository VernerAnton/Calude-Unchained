import { useState, useEffect, useRef, useCallback } from "react";
import { type Message, type ModelValue, type FileAttachment, modelOptions } from "@shared/schema";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ChatInput } from "./ChatInput";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface ThreadPanelProps {
  rootMessage: Message;
  threadMessages: Message[];
  conversationId: number;
  selectedModel: ModelValue;
  systemPrompt?: string | null;
  onClose: () => void;
}

export function ThreadPanel({
  rootMessage,
  threadMessages,
  conversationId,
  selectedModel,
  systemPrompt,
  onClose,
}: ThreadPanelProps) {
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const [sendCount, setSendCount] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const draftTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { toast } = useToast();

  const saveThreadDraft = useCallback(async (draft: string) => {
    if (!rootMessage.id) return;
    try {
      await apiRequest(`/api/messages/${rootMessage.id}/thread-draft`, {
        method: "PATCH",
        body: JSON.stringify({ threadDraft: draft || null }),
      });
      await queryClient.invalidateQueries({ 
        queryKey: ["/api/conversations", conversationId, "messages"] 
      });
    } catch (error) {
      console.error("Failed to save thread draft:", error);
    }
  }, [rootMessage.id, conversationId]);

  const handleDraftChange = useCallback((draft: string) => {
    if (draftTimeoutRef.current) {
      clearTimeout(draftTimeoutRef.current);
    }
    draftTimeoutRef.current = setTimeout(() => {
      saveThreadDraft(draft);
    }, 1000);
  }, [saveThreadDraft]);

  useEffect(() => {
    return () => {
      if (draftTimeoutRef.current) {
        clearTimeout(draftTimeoutRef.current);
      }
    };
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [threadMessages, streamingContent]);

  const getModelLabel = (modelValue?: string | null) => {
    if (!modelValue) return "";
    const model = modelOptions.find(m => m.value === modelValue);
    return model ? model.label : modelValue;
  };

  const handleSendMessage = async (content: string, files?: FileAttachment[]) => {
    try {
      setIsStreaming(true);
      setStreamingContent("");

      const lastThreadMessage = threadMessages.length > 0 
        ? threadMessages[threadMessages.length - 1] 
        : rootMessage;

      const requestBody: Record<string, unknown> = {
        message: content,
        model: selectedModel,
        conversationId,
        parentMessageId: lastThreadMessage.id,
        threadContext: true,
        threadRootId: rootMessage.id,
      };

      if (systemPrompt) {
        requestBody.systemPrompt = systemPrompt;
      }
      
      if (files && files.length > 0) {
        requestBody.files = files;
      }

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let fullContent = "";

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split("\n");

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const data = line.slice(6);
              if (data === "[DONE]") {
                continue;
              }
              try {
                const parsed = JSON.parse(data);
                if (parsed.content) {
                  fullContent += parsed.content;
                  setStreamingContent(fullContent);
                }
              } catch (e) {
                // Skip invalid JSON
              }
            }
          }
        }
      }

      await queryClient.invalidateQueries({ 
        queryKey: ["/api/conversations", conversationId, "messages"] 
      });

      if (draftTimeoutRef.current) {
        clearTimeout(draftTimeoutRef.current);
      }
      saveThreadDraft("");
      setSendCount(c => c + 1);

      setIsStreaming(false);
      setStreamingContent("");
    } catch (error) {
      console.error("Error sending thread message:", error);
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      });
      setIsStreaming(false);
      setStreamingContent("");
    }
  };

  const allMessages = [rootMessage, ...threadMessages];

  return (
    <div className="h-full flex flex-col border-l-2 border-border bg-background">
      <div className="border-b-2 border-border px-4 py-3 flex items-center justify-between flex-shrink-0">
        <div className="flex flex-col">
          <span className="text-sm font-semibold uppercase tracking-wider">Thread</span>
          <span className="text-xs text-muted-foreground">
            {threadMessages.length} {threadMessages.length === 1 ? "reply" : "replies"}
          </span>
        </div>
        <Button
          size="icon"
          variant="ghost"
          onClick={onClose}
          data-testid="button-close-thread"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto py-4 px-4">
        {allMessages.map((message, index) => {
          const isUser = message.role === "user";
          const isRoot = index === 0;
          
          return (
            <div
              key={message.id}
              className={`mb-4 ${isRoot ? "opacity-70 border-b pb-4 border-border" : ""}`}
              data-testid={`thread-message-${message.id}`}
            >
              <div className="flex items-center gap-2 mb-2 text-xs font-semibold uppercase tracking-wider">
                <span>{isUser ? "You" : "Claude"}</span>
                {message.model && !isUser && (
                  <span className="text-[10px] opacity-70">
                    • {getModelLabel(message.model)}
                  </span>
                )}
                {isRoot && (
                  <span className="text-[10px] opacity-70">• Thread root</span>
                )}
              </div>
              <div className="break-words leading-relaxed prose prose-sm dark:prose-invert max-w-none prose-headings:font-mono prose-headings:uppercase prose-headings:tracking-wider prose-code:before:content-none prose-code:after:content-none prose-code:bg-muted prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-pre:bg-muted prose-pre:border-2 prose-pre:border-border">
                {isUser ? (
                  <div className="whitespace-pre-wrap">{message.content}</div>
                ) : (
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {message.content}
                  </ReactMarkdown>
                )}
              </div>
            </div>
          );
        })}

        {isStreaming && (
          <div className="mb-4" data-testid="thread-streaming-message">
            <div className="flex items-center gap-2 mb-2 text-xs font-semibold uppercase tracking-wider">
              <span>Claude</span>
            </div>
            <div className="break-words leading-relaxed prose prose-sm dark:prose-invert max-w-none prose-headings:font-mono prose-headings:uppercase prose-headings:tracking-wider prose-code:before:content-none prose-code:after:content-none prose-code:bg-muted prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-pre:bg-muted prose-pre:border-2 prose-pre:border-border">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {streamingContent}
              </ReactMarkdown>
              <span className="inline-block animate-blink ml-1">▌</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className="border-t-2 border-border px-4 py-3 flex-shrink-0">
        <ChatInput 
          key={`thread-input-${rootMessage.id}-${sendCount}`}
          onSend={handleSendMessage} 
          disabled={isStreaming}
          placeholder="Reply in thread..."
          testIdPrefix="thread-"
          initialValue={sendCount === 0 ? (rootMessage.threadDraft || "") : ""}
          onDraftChange={handleDraftChange}
        />
      </div>
    </div>
  );
}
