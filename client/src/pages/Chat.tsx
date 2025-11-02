import { useState, useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useChat } from "@ai-sdk/react";
import { ModelSelector } from "@/components/ModelSelector";
import { ChatWindow } from "@/components/ChatWindow";
import { ChatInput } from "@/components/ChatInput";
import { SystemPromptDialog } from "@/components/SystemPromptDialog";
import { ExportButton } from "@/components/ExportButton";
import { EditableChatTitle } from "@/components/EditableChatTitle";
import { type Message, type ModelValue, type Conversation } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

export default function Chat() {
  const [, params] = useRoute("/chat/:id");
  const [, navigate] = useLocation();
  const conversationId = params?.id ? parseInt(params.id) : null;
  
  const [selectedModel, setSelectedModel] = useState<ModelValue>("claude-sonnet-4-5");
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

  const { data: dbMessages = [] } = useQuery<Message[]>({
    queryKey: ["/api/conversations", conversationId, "messages"],
    queryFn: async () => {
      if (!conversationId) return [];
      const response = await fetch(`/api/conversations/${conversationId}/messages`);
      if (!response.ok) throw new Error("Failed to fetch messages");
      return response.json();
    },
    enabled: !!conversationId,
  });

  // Vercel AI SDK useChat hook for smooth streaming
  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    isLoading,
    setMessages,
  } = useChat({
    api: "/api/chat",
    body: {
      model: selectedModel,
      conversationId,
      systemPrompt: conversation?.systemPrompt,
    },
    onFinish: () => {
      // Refresh messages from database after streaming completes
      queryClient.invalidateQueries({ queryKey: ["/api/conversations", conversationId, "messages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send message",
        variant: "destructive",
      });
    },
  });

  // Sync database messages with useChat hook messages when conversation changes
  useEffect(() => {
    if (dbMessages.length > 0) {
      setMessages(dbMessages.map(msg => ({
        id: String(msg.id),
        role: msg.role as "user" | "assistant",
        content: msg.content,
      })));
    } else {
      setMessages([]);
    }
  }, [conversationId, dbMessages, setMessages]);

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


  const handleSendMessage = async (content: string) => {
    try {
      // If no conversation exists, create one first
      if (!conversationId) {
        const newConv = await createConversationMutation.mutateAsync(content);
        // Navigation will happen in the mutation's onSuccess callback
        // The message will be sent after navigation when the chat loads
        return;
      }

      // Use Vercel AI SDK's append function to send message with streaming
      handleSubmit(new Event('submit') as any, {
        data: {
          message: content,
          model: selectedModel,
          conversationId,
          systemPrompt: conversation?.systemPrompt,
        },
      });
    } catch (error) {
      console.error("Error sending message:", error);
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      });
    }
  };

  const deleteMessageMutation = useMutation({
    mutationFn: async (messageId: number) => {
      return await apiRequest(`/api/messages/${messageId}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations", conversationId, "messages"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete message",
        variant: "destructive",
      });
    },
  });

  const updateSystemPromptMutation = useMutation({
    mutationFn: async (systemPrompt: string) => {
      if (!conversationId) return;
      return await apiRequest(`/api/conversations/${conversationId}`, {
        method: "PATCH",
        body: JSON.stringify({ systemPrompt: systemPrompt || null }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations", conversationId] });
      toast({
        title: "Success",
        description: "System prompt updated",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update system prompt",
        variant: "destructive",
      });
    },
  });

  const handleSaveSystemPrompt = (systemPrompt: string) => {
    updateSystemPromptMutation.mutate(systemPrompt);
  };

  const updateTitleMutation = useMutation({
    mutationFn: async (newTitle: string) => {
      if (!conversationId) return;
      return await apiRequest(`/api/conversations/${conversationId}`, {
        method: "PATCH",
        body: JSON.stringify({ title: newTitle }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations", conversationId] });
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      toast({
        title: "Success",
        description: "Chat title updated",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update chat title",
        variant: "destructive",
      });
    },
  });

  const handleSaveTitle = (newTitle: string) => {
    updateTitleMutation.mutate(newTitle);
  };

  const handleEditMessage = async (messageId: number, newContent: string) => {
    if (!conversationId) return;
    
    await deleteMessageMutation.mutateAsync(messageId);
    
    const messagesToDelete = dbMessages.filter(m => m.id > messageId);
    for (const msg of messagesToDelete) {
      await deleteMessageMutation.mutateAsync(msg.id);
    }
    
    await handleSendMessage(newContent);
  };

  const handleRegenerateMessage = async (messageId: number) => {
    if (!conversationId) return;
    
    const messageIndex = dbMessages.findIndex(m => m.id === messageId);
    if (messageIndex === -1 || messageIndex === 0) return;
    
    const previousMessage = dbMessages[messageIndex - 1];
    if (previousMessage.role !== "user") return;
    
    const messagesToDelete = dbMessages.filter(m => m.id >= messageId);
    for (const msg of messagesToDelete) {
      await deleteMessageMutation.mutateAsync(msg.id);
    }
    
    await handleSendMessage(previousMessage.content);
  };

  const handleDeleteMessage = (messageId: number) => {
    deleteMessageMutation.mutate(messageId);
  };

  return (
    <div className="h-full w-full flex flex-col">
      <div className="w-full flex flex-col h-full">
        {/* Header */}
        <div className="border-b-2 border-border px-6 py-3 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-4">
            {conversation?.title ? (
              <EditableChatTitle
                title={conversation.title}
                onSave={handleSaveTitle}
                disabled={updateTitleMutation.isPending}
              />
            ) : (
              <h1 className="text-lg font-bold tracking-wide text-muted-foreground">
                New Chat
              </h1>
            )}
            {conversation?.systemPrompt && (
              <span className="text-xs text-muted-foreground">
                • Custom Prompt
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <ModelSelector value={selectedModel} onChange={setSelectedModel} />
            <SystemPromptDialog
              conversationId={conversationId}
              currentSystemPrompt={conversation?.systemPrompt}
              onSave={handleSaveSystemPrompt}
            />
            <ExportButton conversation={conversation} messages={dbMessages} />
          </div>
        </div>

        {/* Chat Messages - Full Width */}
        <ChatWindow 
          messages={dbMessages} 
          isStreaming={isLoading}
          streamingContent={isLoading && messages.length > dbMessages.length ? messages[messages.length - 1]?.content || "" : ""}
          onEditMessage={handleEditMessage}
          onRegenerateMessage={handleRegenerateMessage}
          onDeleteMessage={handleDeleteMessage}
        />

        {/* Input Area */}
        <div className="border-t-2 border-border px-6 py-4 flex-shrink-0">
          <ChatInput onSend={handleSendMessage} disabled={isLoading} />
        </div>
      </div>
    </div>
  );
}
