import { useState } from "react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ModelSelector } from "@/components/ModelSelector";
import { ChatWindow } from "@/components/ChatWindow";
import { ChatInput } from "@/components/ChatInput";
import { type Message, type ModelValue } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedModel, setSelectedModel] = useState<ModelValue>("claude-sonnet-4-5");
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const { toast } = useToast();

  const handleSendMessage = async (content: string) => {
    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsStreaming(true);
    setStreamingContent("");

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: content,
          model: selectedModel,
          conversationHistory: messages,
        }),
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

      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: fullContent,
        model: selectedModel,
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
      setIsStreaming(false);
      setStreamingContent("");
    } catch (error) {
      console.error("Error sending message:", error);
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      });
      setIsStreaming(false);
      setStreamingContent("");
    }
  };

  return (
    <div className="h-full w-full flex flex-col">
      <div className="max-w-[900px] w-full mx-auto p-4 sm:p-8 flex flex-col h-full">
        {/* Header */}
        <header className="flex items-center justify-between border-b-2 border-border pb-4 mb-4">
          <ThemeToggle />
          <h1 className="text-2xl sm:text-4xl font-bold tracking-[0.05em] text-center flex-1">
            ════ CLAUDE CHAT ════
          </h1>
          <div className="w-[80px] sm:w-[120px]"></div>
        </header>

        {/* Model Selector */}
        <div className="flex justify-center mb-4">
          <ModelSelector value={selectedModel} onChange={setSelectedModel} />
        </div>

        <div className="text-center opacity-80 mb-6 text-sm sm:text-base px-4">
          [ Chat with Claude AI using a vintage typewriter interface ]
        </div>

        {/* Chat Window */}
        <ChatWindow 
          messages={messages} 
          isStreaming={isStreaming}
          streamingContent={streamingContent}
        />

        {/* Input Area */}
        <div className="mt-6">
          <ChatInput onSend={handleSendMessage} disabled={isStreaming} />
        </div>
      </div>
    </div>
  );
}
