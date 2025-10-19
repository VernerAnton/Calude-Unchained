import { useState, useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { ModelSelector } from "@/components/ModelSelector";
import { ChatWindow } from "@/components/ChatWindow";
import { ChatInput } from "@/components/ChatInput";
import { type Message, type ModelValue, type Conversation } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

export default function Chat() {
  const [, params] = useRoute("/chat/:id");
  const [, navigate] = useLocation();
  const conversationId = params?.id ? parseInt(params.id) : null;
  
  const [selectedModel, setSelectedModel] = useState<ModelValue>("claude-sonnet-4-5");
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const { toast } = useToast();

  const { data: conversation } = useQuery<Conversation>({
    queryKey: ["/api/conversations", conversationId],
    queryFn: async () => {
      if (!conversationId) return null;
      const response = await fetch(`/api/conversations/${conversationId}`);
      if (!response.ok) throw new Error("Failed to fetch conversation");
      return response.json();
    },
    enabled: !!conversationId,
  });

  const { data: messages = [] } = useQuery<Message[]>({
    queryKey: ["/api/conversations", conversationId, "messages"],
    queryFn: async () => {
      if (!conversationId) return [];
      const response = await fetch(`/api/conversations/${conversationId}/messages`);
      if (!response.ok) throw new Error("Failed to fetch messages");
      return response.json();
    },
    enabled: !!conversationId,
  });

  const createConversationMutation = useMutation({
    mutationFn: async (firstMessage: string) => {
      const conv = await apiRequest("/api/conversations", {
        method: "POST",
        body: JSON.stringify({ title: firstMessage.slice(0, 50) + (firstMessage.length > 50 ? "..." : "") }),
      });
      return conv as Conversation;
    },
    onSuccess: (newConv) => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      navigate(`/chat/${newConv.id}`);
    },
  });

  const saveMessageMutation = useMutation({
    mutationFn: async (message: { conversationId: number; role: string; content: string; model?: string }) => {
      return await apiRequest("/api/messages", {
        method: "POST",
        body: JSON.stringify(message),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations", conversationId, "messages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
    },
  });

  const handleSendMessage = async (content: string) => {
    try {
      let activeConversationId = conversationId;

      if (!activeConversationId) {
        const newConv = await createConversationMutation.mutateAsync(content);
        activeConversationId = newConv.id;
      }

      const userMessageData = {
        conversationId: activeConversationId,
        role: "user",
        content,
        model: undefined,
      };

      await saveMessageMutation.mutateAsync(userMessageData);

      setIsStreaming(true);
      setStreamingContent("");

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: content,
          model: selectedModel,
          conversationId: activeConversationId,
          systemPrompt: conversation?.systemPrompt,
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

      const assistantMessageData = {
        conversationId: activeConversationId,
        role: "assistant",
        content: fullContent,
        model: selectedModel,
      };

      await saveMessageMutation.mutateAsync(assistantMessageData);

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
        <h1 className="text-2xl sm:text-4xl font-bold tracking-[0.05em] text-center border-b-2 border-border pb-4 mb-4">
          ════ CLAUDE CHAT ════
        </h1>

        <div className="flex justify-center mb-4">
          <ModelSelector value={selectedModel} onChange={setSelectedModel} />
        </div>

        <div className="text-center opacity-80 mb-6 text-sm sm:text-base px-4">
          {conversation?.title || "[ Chat with Claude AI using a vintage typewriter interface ]"}
        </div>

        <ChatWindow 
          messages={messages} 
          isStreaming={isStreaming}
          streamingContent={streamingContent}
        />

        <div className="mt-6">
          <ChatInput onSend={handleSendMessage} disabled={isStreaming} />
        </div>
      </div>
    </div>
  );
}
