import { useState, useMemo, useRef, useCallback, useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { ModelSelector } from "@/components/ModelSelector";
import { ChatWindow } from "@/components/ChatWindow";
import { ChatInput } from "@/components/ChatInput";
import { SystemPromptDialog } from "@/components/SystemPromptDialog";
import { ExportButton } from "@/components/ExportButton";
import { EditableChatTitle } from "@/components/EditableChatTitle";
import { ThreadPanel } from "@/components/ThreadPanel";
import { ThreadsDropdown } from "@/components/ThreadsDropdown";
import { type Message, type ModelValue, type Conversation, type FileAttachment, type MessageFile } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { getActivePath, getSiblings, getThreadMessages, normalizeParentId, type BranchSelection } from "@/lib/messageTree";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { useSettings } from "@/contexts/SettingsContext";
import { SidebarTrigger } from "@/components/ui/sidebar";

export default function Chat() {
  const [, params] = useRoute("/chat/:id");
  const [, navigate] = useLocation();
  const conversationId = params?.id ? parseInt(params.id) : null;
  const { settings, isReady } = useSettings();
  
  const [selectedModel, setSelectedModel] = useState<ModelValue | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const [pendingUserMessage, setPendingUserMessage] = useState<string | null>(null);
  const [branchSelections, setBranchSelections] = useState<BranchSelection>({});
  const [threadRootId, setThreadRootId] = useState<number | null>(null);
  const { toast } = useToast();
  
  useEffect(() => {
    if (isReady && selectedModel === null && settings?.defaultModel) {
      setSelectedModel(settings.defaultModel as ModelValue);
    }
  }, [isReady, selectedModel, settings?.defaultModel]);
  
  const effectiveModel = selectedModel || (settings?.defaultModel as ModelValue) || "claude-sonnet-4-5";
  
  const streamingContentRef = useRef("");
  const rafIdRef = useRef<number | null>(null);
  const draftTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const flushStreamingContent = useCallback(() => {
    setStreamingContent(streamingContentRef.current);
    rafIdRef.current = null;
  }, []);
  
  const scheduleStreamingUpdate = useCallback((content: string) => {
    streamingContentRef.current = content;
    if (rafIdRef.current === null) {
      rafIdRef.current = requestAnimationFrame(flushStreamingContent);
    }
  }, [flushStreamingContent]);

  const saveDraft = useCallback(async (draft: string) => {
    if (!conversationId) return;
    try {
      await apiRequest(`/api/conversations/${conversationId}`, {
        method: "PATCH",
        body: JSON.stringify({ draft: draft || null }),
      });
      await queryClient.invalidateQueries({ queryKey: ["/api/conversations", conversationId] });
    } catch (error) {
      console.error("Failed to save draft:", error);
    }
  }, [conversationId]);

  const handleDraftChange = useCallback((draft: string) => {
    if (draftTimeoutRef.current) {
      clearTimeout(draftTimeoutRef.current);
    }
    draftTimeoutRef.current = setTimeout(() => {
      saveDraft(draft);
    }, 1000);
  }, [saveDraft]);

  useEffect(() => {
    return () => {
      if (draftTimeoutRef.current) {
        clearTimeout(draftTimeoutRef.current);
      }
    };
  }, []);

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

  const { data: messageFiles = [] } = useQuery<MessageFile[]>({
    queryKey: ["/api/conversations", conversationId, "files"],
    queryFn: async () => {
      if (!conversationId) return [];
      const response = await fetch(`/api/conversations/${conversationId}/files`);
      if (!response.ok) throw new Error("Failed to fetch message files");
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

  const handleSendMessage = async (content: string, parentMessageId?: number | null, files?: FileAttachment[]) => {
    let activeConversationId = conversationId;
    let isNewConversation = false;

    try {
      if (!activeConversationId) {
        const newConv = await createConversationMutation.mutateAsync(content);
        activeConversationId = newConv.id;
        isNewConversation = true;
      }

      setIsStreaming(true);
      setStreamingContent("");
      streamingContentRef.current = "";
      setPendingUserMessage(content);

      const lastMessage = activePath.length > 0 ? activePath[activePath.length - 1] : null;
      const effectiveParentId = isNewConversation ? null : (parentMessageId !== undefined ? parentMessageId : (lastMessage?.id ?? null));

      const requestBody: Record<string, unknown> = {
        message: content,
        model: effectiveModel,
        conversationId: activeConversationId,
        parentMessageId: effectiveParentId,
      };
      
      if (conversation?.systemPrompt) {
        requestBody.systemPrompt = conversation.systemPrompt;
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
        const errorData = await response.json().catch(() => null);
        if (errorData?.error === "BUDGET_EXCEEDED") {
          toast({
            title: "Budget Exceeded",
            description: errorData.message || "Monthly budget exceeded. Adjust your budget in settings to continue.",
            variant: "destructive",
          });
          setIsStreaming(false);
          setPendingUserMessage(null);
          return;
        }
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
                  scheduleStreamingUpdate(fullContent);
                }
              } catch (e) {
                // Skip invalid JSON
              }
            }
          }
        }
      }

      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
      
      await queryClient.invalidateQueries({ queryKey: ["/api/conversations", activeConversationId, "messages"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/conversations", activeConversationId, "files"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/usage/summary"] });
      
      // Check for 80% budget warning
      try {
        const usageResponse = await fetch("/api/usage/summary");
        if (usageResponse.ok) {
          const usageData = await usageResponse.json();
          if (usageData.monthlyBudget && usageData.warnAt80) {
            const percentUsed = (usageData.thisMonth / usageData.monthlyBudget) * 100;
            if (percentUsed >= 80 && percentUsed < 100) {
              toast({
                title: "Budget Warning",
                description: `You've used ${percentUsed.toFixed(0)}% of your monthly budget.`,
                variant: "destructive",
              });
            }
          }
        }
      } catch (e) {
        // Ignore usage fetch errors
      }

      if (draftTimeoutRef.current) {
        clearTimeout(draftTimeoutRef.current);
      }
      saveDraft("");

      setIsStreaming(false);
      setStreamingContent("");
      streamingContentRef.current = "";
      setPendingUserMessage(null);
    } catch (error) {
      console.error("Error sending message:", error);
      
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
      
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      });
      setIsStreaming(false);
      setStreamingContent("");
      streamingContentRef.current = "";
      setPendingUserMessage(null);
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
        <div className="border-b-2 border-border px-4 py-3 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
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
            <ModelSelector value={effectiveModel} onChange={setSelectedModel} />
            <ThreadsDropdown
              messages={messages}
              onOpenThread={handleOpenThread}
              conversationId={conversationId}
            />
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
          messageFiles={messageFiles}
          branchSelections={branchSelections}
          isStreaming={isStreaming}
          streamingContent={streamingContent}
          pendingUserMessage={pendingUserMessage}
          onEditMessage={handleEditMessage}
          onRegenerateMessage={handleRegenerateMessage}
          onDeleteMessage={handleDeleteMessage}
          onBranchNavigate={handleBranchNavigate}
          onOpenThread={handleOpenThread}
        />

        <div className="border-t-2 border-border px-6 py-4 flex-shrink-0">
          <ChatInput 
            onSend={(content, files) => handleSendMessage(content, undefined, files)} 
            disabled={isStreaming}
            initialValue={conversation?.draft || ""}
            onDraftChange={handleDraftChange}
          />
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
            selectedModel={effectiveModel}
            systemPrompt={conversation?.systemPrompt}
            onClose={handleCloseThread}
          />
        </ResizablePanel>
      </ResizablePanelGroup>
    );
  }

  return mainContent;
}
