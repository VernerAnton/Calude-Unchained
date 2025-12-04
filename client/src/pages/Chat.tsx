import { useState, useMemo } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { ModelSelector } from "@/components/ModelSelector";
import { ChatWindow } from "@/components/ChatWindow";
import { ChatInput } from "@/components/ChatInput";
import { SystemPromptDialog } from "@/components/SystemPromptDialog";
import { ExportButton } from "@/components/ExportButton";
import { EditableChatTitle } from "@/components/EditableChatTitle";
import { ThreadPanel } from "@/components/ThreadPanel";
import { type Message, type ModelValue, type Conversation } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { getActivePath, getSiblings, getThreadMessages, normalizeParentId, type BranchSelection } from "@/lib/messageTree";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";

export default function Chat() {
  const [, params] = useRoute("/chat/:id");
  const [, navigate] = useLocation();
  const conversationId = params?.id ? parseInt(params.id) : null;
  
  const [selectedModel, setSelectedModel] = useState<ModelValue>("claude-sonnet-4-5");
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const [branchSelections, setBranchSelections] = useState<BranchSelection>({});
  const [threadRootId, setThreadRootId] = useState<number | null>(null);
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

  const activePath = useMemo(() => {
    return getActivePath(messages, branchSelections);
  }, [messages, branchSelections]);

  const threadMessages = useMemo(() => {
    if (!threadRootId) return [];
    const allThreadMsgs = getThreadMessages(messages, threadRootId, branchSelections);
    return allThreadMsgs.slice(1);
  }, [messages, threadRootId, branchSelections]);

  const threadRootMessage = useMemo(() => {
    if (!threadRootId) return null;
    return messages.find(m => m.id === threadRootId) || null;
  }, [messages, threadRootId]);

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

  const handleSendMessage = async (content: string, parentMessageId?: number | null) => {
    let activeConversationId = conversationId;

    try {
      if (!activeConversationId) {
        const newConv = await createConversationMutation.mutateAsync(content);
        activeConversationId = newConv.id;
      }

      setIsStreaming(true);
      setStreamingContent("");

      const lastMessage = activePath.length > 0 ? activePath[activePath.length - 1] : null;
      const effectiveParentId = parentMessageId !== undefined ? parentMessageId : (lastMessage?.id ?? null);

      const requestBody: Record<string, unknown> = {
        message: content,
        model: selectedModel,
        conversationId: activeConversationId,
        parentMessageId: effectiveParentId,
      };
      
      if (conversation?.systemPrompt) {
        requestBody.systemPrompt = conversation.systemPrompt;
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

      await queryClient.invalidateQueries({ queryKey: ["/api/conversations", activeConversationId, "messages"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });

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
    
    const editedMessage = messages.find(m => m.id === messageId);
    if (!editedMessage) return;
    
    const parentId = editedMessage.parentMessageId;
    
    await handleSendMessage(newContent, parentId);
    
    const normalizedKey = normalizeParentId(parentId);
    const siblings = getSiblings(messages, editedMessage);
    const newIndex = siblings.length;
    setBranchSelections(prev => ({
      ...prev,
      [normalizedKey]: newIndex,
    }));
  };

  const handleRegenerateMessage = async (messageId: number) => {
    if (!conversationId) return;
    
    const targetMessage = messages.find(m => m.id === messageId);
    if (!targetMessage || targetMessage.role !== "assistant") return;
    
    const parentUserMessage = messages.find(m => m.id === targetMessage.parentMessageId);
    if (!parentUserMessage || parentUserMessage.role !== "user") return;
    
    const grandParentId = parentUserMessage.parentMessageId;
    
    await handleSendMessage(parentUserMessage.content, grandParentId);
    
    const normalizedKey = normalizeParentId(grandParentId);
    const userMsgSiblings = getSiblings(messages, parentUserMessage);
    const newIndex = userMsgSiblings.length;
    setBranchSelections(prev => ({
      ...prev,
      [normalizedKey]: newIndex,
    }));
  };

  const handleDeleteMessage = (messageId: number) => {
    deleteMessageMutation.mutate(messageId);
  };

  const handleBranchNavigate = (parentId: number | null, direction: "prev" | "next") => {
    const normalizedKey = normalizeParentId(parentId);
    const currentIndex = branchSelections[normalizedKey] ?? 0;
    
    const dummyMsg = { parentMessageId: parentId } as Message;
    const siblings = getSiblings(messages, dummyMsg);
    
    let newIndex = currentIndex;
    if (direction === "prev" && currentIndex > 0) {
      newIndex = currentIndex - 1;
    } else if (direction === "next" && currentIndex < siblings.length - 1) {
      newIndex = currentIndex + 1;
    }
    
    setBranchSelections(prev => ({
      ...prev,
      [normalizedKey]: newIndex,
    }));
  };

  const handleOpenThread = (messageId: number) => {
    setThreadRootId(messageId);
  };

  const handleCloseThread = () => {
    setThreadRootId(null);
  };

  const mainContent = (
    <div className="h-full w-full flex flex-col">
      <div className="w-full flex flex-col h-full">
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
            <ExportButton conversation={conversation} messages={activePath} />
          </div>
        </div>

        <ChatWindow 
          messages={messages}
          activePath={activePath}
          allMessages={messages}
          branchSelections={branchSelections}
          isStreaming={isStreaming}
          streamingContent={streamingContent}
          onEditMessage={handleEditMessage}
          onRegenerateMessage={handleRegenerateMessage}
          onDeleteMessage={handleDeleteMessage}
          onBranchNavigate={handleBranchNavigate}
          onOpenThread={handleOpenThread}
        />

        <div className="border-t-2 border-border px-6 py-4 flex-shrink-0">
          <ChatInput onSend={(content) => handleSendMessage(content)} disabled={isStreaming} />
        </div>
      </div>
    </div>
  );

  if (threadRootId && threadRootMessage && conversationId) {
    return (
      <ResizablePanelGroup direction="horizontal" className="h-full">
        <ResizablePanel defaultSize={60} minSize={30}>
          {mainContent}
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel defaultSize={40} minSize={25}>
          <ThreadPanel
            rootMessage={threadRootMessage}
            threadMessages={threadMessages}
            conversationId={conversationId}
            selectedModel={selectedModel}
            systemPrompt={conversation?.systemPrompt}
            onClose={handleCloseThread}
          />
        </ResizablePanel>
      </ResizablePanelGroup>
    );
  }

  return mainContent;
}
