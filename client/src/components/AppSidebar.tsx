import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Plus, Trash2, MessageSquare } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Conversation } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export function AppSidebar() {
  const [location, navigate] = useLocation();
  const { toast } = useToast();

  const { data: conversations = [] } = useQuery<Conversation[]>({
    queryKey: ["/api/conversations"],
  });

  const createConversationMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("/api/conversations", {
        method: "POST",
        body: JSON.stringify({ title: "New Chat" }),
      });
    },
    onSuccess: (newConv: Conversation) => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      navigate(`/chat/${newConv.id}`);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create conversation",
        variant: "destructive",
      });
    },
  });

  const deleteConversationMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest(`/api/conversations/${id}`, {
        method: "DELETE",
      });
    },
    onSuccess: (_data, deletedId) => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      const currentId = location.split("/")[2];
      if (currentId === String(deletedId)) {
        navigate("/");
      }
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete conversation",
        variant: "destructive",
      });
    },
  });

  const handleNewChat = () => {
    createConversationMutation.mutate();
  };

  const handleDeleteConversation = (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    if (confirm("Delete this conversation?")) {
      deleteConversationMutation.mutate(id);
    }
  };

  const currentConversationId = location.startsWith("/chat/")
    ? parseInt(location.split("/")[2])
    : null;

  return (
    <Sidebar data-testid="sidebar-conversations">
      <SidebarHeader className="p-4 border-b-2 border-border">
        <div className="text-xl font-bold tracking-[0.05em] mb-3">
          ══ CLAUDE ══
        </div>
        <button
          onClick={handleNewChat}
          disabled={createConversationMutation.isPending}
          className="w-full border-2 border-border bg-card text-card-foreground px-4 py-2 font-bold uppercase tracking-wider transition-all hover-elevate active-elevate-2 shadow-md disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          style={{ boxShadow: "4px 4px 0px hsl(var(--border))" }}
          data-testid="button-new-conversation"
        >
          <Plus className="h-4 w-4" />
          NEW CHAT
        </button>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs uppercase tracking-[0.1em]">
            Conversations
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {conversations.length === 0 ? (
                <div className="p-4 text-sm text-muted-foreground text-center">
                  No conversations yet
                </div>
              ) : (
                conversations.map((conv) => (
                  <SidebarMenuItem key={conv.id}>
                    <SidebarMenuButton
                      asChild
                      isActive={currentConversationId === conv.id}
                      data-testid={`conversation-item-${conv.id}`}
                    >
                      <button
                        onClick={() => navigate(`/chat/${conv.id}`)}
                        className="flex items-center justify-between w-full group"
                      >
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <MessageSquare className="h-4 w-4 flex-shrink-0" />
                          <span className="truncate">{conv.title}</span>
                        </div>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6 opacity-0 group-hover:opacity-100 flex-shrink-0"
                          onClick={(e) => handleDeleteConversation(e, conv.id)}
                          data-testid={`button-delete-conversation-${conv.id}`}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </button>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4 border-t-2 border-border">
        <div className="text-xs text-muted-foreground text-center">
          Powered by Claude AI
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
