import { useState, useEffect, useRef } from "react";
import { type Message, type ModelValue, modelOptions } from "@shared/schema";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ChatInput } from "./ChatInput";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";

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
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

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

  const handleSendMessage = async (content: string) => {
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
              <div className="whitespace-pre-wrap break-words leading-relaxed">
                {message.content}
              </div>
            </div>
          );
        })}

        {isStreaming && (
          <div className="mb-4" data-testid="thread-streaming-message">
            <div className="flex items-center gap-2 mb-2 text-xs font-semibold uppercase tracking-wider">
              <span>Claude</span>
            </div>
            <div className="whitespace-pre-wrap break-words leading-relaxed">
              {streamingContent}
              <span className="inline-block animate-blink ml-1">▌</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className="border-t-2 border-border px-4 py-3 flex-shrink-0">
        <ChatInput 
          onSend={handleSendMessage} 
          disabled={isStreaming}
          placeholder="Reply in thread..."
        />
      </div>
    </div>
  );
}
