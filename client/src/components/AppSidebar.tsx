import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Plus, Trash2, MessageSquare, ChevronRight, ChevronDown, Folder, FolderOpen, Settings } from "lucide-react";
import { useState } from "react";
import { ProjectDialog } from "./ProjectDialog";
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
import { Conversation, Project } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export function AppSidebar() {
  const [location, navigate] = useLocation();
  const { toast } = useToast();
  const [expandedProjects, setExpandedProjects] = useState<Set<number>>(new Set());
  const [showAllProjects, setShowAllProjects] = useState(false);
  const [draggedConversationId, setDraggedConversationId] = useState<number | null>(null);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

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

  const createProjectMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("/api/projects", {
        method: "POST",
        body: JSON.stringify({ name: "New Project" }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      toast({
        title: "Success",
        description: "Project created",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create project",
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

  const deleteProjectMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest(`/api/projects/${id}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      toast({
        title: "Success",
        description: "Project deleted",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete project",
        variant: "destructive",
      });
    },
  });

  const moveConversationMutation = useMutation({
    mutationFn: async ({ conversationId, projectId }: { conversationId: number; projectId: number | null }) => {
      return await apiRequest(`/api/conversations/${conversationId}`, {
        method: "PATCH",
        body: JSON.stringify({ projectId }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      toast({
        title: "Success",
        description: "Chat moved",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to move chat",
        variant: "destructive",
      });
    },
  });

  const handleNewChat = () => {
    createConversationMutation.mutate();
  };

  const handleNewProject = () => {
    createProjectMutation.mutate();
  };

  const handleDeleteConversation = (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    if (confirm("Delete this conversation?")) {
      deleteConversationMutation.mutate(id);
    }
  };

  const handleDeleteProject = (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    if (confirm("Delete this project? All conversations will be ungrouped.")) {
      deleteProjectMutation.mutate(id);
    }
  };

  const toggleProject = (projectId: number) => {
    const newExpanded = new Set(expandedProjects);
    if (newExpanded.has(projectId)) {
      newExpanded.delete(projectId);
    } else {
      newExpanded.add(projectId);
    }
    setExpandedProjects(newExpanded);
  };

  const handleDragStart = (conversationId: number) => {
    setDraggedConversationId(conversationId);
  };

  const handleDragEnd = () => {
    setDraggedConversationId(null);
  };

  const handleDrop = (projectId: number | null) => {
    if (draggedConversationId !== null) {
      moveConversationMutation.mutate({
        conversationId: draggedConversationId,
        projectId,
      });
      setDraggedConversationId(null);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const currentConversationId = location.startsWith("/chat/")
    ? parseInt(location.split("/")[2])
    : null;

  const projectsToShow = showAllProjects ? projects : projects.slice(0, 5);
  const hasMoreProjects = projects.length > 5;
  const ungroupedConversations = conversations.filter(c => !c.projectId);

  return (
    <Sidebar data-testid="sidebar-conversations">
      <SidebarHeader className="p-4 border-b-2 border-border">
        <div className="text-xl font-bold tracking-[0.05em] mb-3">
          ══ CLAUDE UNCHAINED ══
        </div>
        <button
          onClick={handleNewChat}
          disabled={createConversationMutation.isPending}
          className="w-full border-2 border-border bg-card text-card-foreground px-4 py-2 font-bold uppercase tracking-wider transition-all hover-elevate active-elevate-2 shadow-md disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 mb-2"
          style={{ boxShadow: "4px 4px 0px hsl(var(--border))" }}
          data-testid="button-new-conversation"
        >
          <Plus className="h-4 w-4" />
          NEW CHAT
        </button>
        <button
          onClick={handleNewProject}
          disabled={createProjectMutation.isPending}
          className="w-full border-2 border-border bg-card text-card-foreground px-4 py-2 font-bold uppercase tracking-wider transition-all hover-elevate active-elevate-2 shadow-md disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          style={{ boxShadow: "4px 4px 0px hsl(var(--border))" }}
          data-testid="button-new-project"
        >
          <Plus className="h-4 w-4" />
          NEW PROJECT
        </button>
      </SidebarHeader>

      <SidebarContent>
        {projects.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-xs uppercase tracking-[0.1em]">
              Projects
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {projectsToShow.map((project) => {
                  const isExpanded = expandedProjects.has(project.id);
                  const projectConvs = conversations.filter(c => c.projectId === project.id);
                  
                  return (
                    <div key={project.id}>
                      <SidebarMenuItem>
                        <div 
                          className="flex items-center justify-between w-full group"
                          onDragOver={handleDragOver}
                          onDrop={(e) => {
                            e.preventDefault();
                            handleDrop(project.id);
                          }}
                        >
                          <button
                            onClick={() => toggleProject(project.id)}
                            className="flex items-center gap-2 flex-1 min-w-0 px-2 py-1.5 hover-elevate"
                            data-testid={`project-item-${project.id}`}
                          >
                            {isExpanded ? (
                              <ChevronDown className="h-4 w-4 flex-shrink-0" />
                            ) : (
                              <ChevronRight className="h-4 w-4 flex-shrink-0" />
                            )}
                            {isExpanded ? (
                              <FolderOpen className="h-4 w-4 flex-shrink-0" />
                            ) : (
                              <Folder className="h-4 w-4 flex-shrink-0" />
                            )}
                            <span className="truncate font-semibold">{project.name}</span>
                            <span className="text-xs text-muted-foreground">({projectConvs.length})</span>
                          </button>
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 flex-shrink-0">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedProject(project);
                              }}
                              className="h-6 w-6 flex items-center justify-center hover-elevate"
                              data-testid={`button-settings-project-${project.id}`}
                            >
                              <Settings className="h-3 w-3" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteProject(e, project.id);
                              }}
                              className="h-6 w-6 flex items-center justify-center hover-elevate"
                              data-testid={`button-delete-project-${project.id}`}
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                      </SidebarMenuItem>
                      
                      {isExpanded && (
                        <div className="ml-6 border-l-2 border-border pl-2">
                          {projectConvs.length === 0 ? (
                            <div className="p-2 text-xs text-muted-foreground">
                              No chats in this project
                            </div>
                          ) : (
                            projectConvs.map((conv) => (
                              <SidebarMenuItem key={conv.id}>
                                <div 
                                  className="flex items-center justify-between w-full group"
                                  draggable
                                  onDragStart={() => handleDragStart(conv.id)}
                                  onDragEnd={handleDragEnd}
                                >
                                  <SidebarMenuButton
                                    asChild
                                    isActive={currentConversationId === conv.id}
                                    data-testid={`conversation-item-${conv.id}`}
                                    className="flex-1"
                                  >
                                    <button
                                      onClick={() => navigate(`/chat/${conv.id}`)}
                                      className="flex items-center gap-2 flex-1 min-w-0 cursor-move"
                                    >
                                      <MessageSquare className="h-4 w-4 flex-shrink-0" />
                                      <span className="truncate text-sm">{conv.title}</span>
                                    </button>
                                  </SidebarMenuButton>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteConversation(e, conv.id);
                                    }}
                                    className="h-6 w-6 opacity-0 group-hover:opacity-100 flex-shrink-0 flex items-center justify-center hover-elevate"
                                    data-testid={`button-delete-conversation-${conv.id}`}
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </button>
                                </div>
                              </SidebarMenuItem>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
                
                {hasMoreProjects && !showAllProjects && (
                  <SidebarMenuItem>
                    <button
                      onClick={() => setShowAllProjects(true)}
                      className="w-full px-2 py-1.5 text-sm text-muted-foreground hover-elevate"
                      data-testid="button-show-more-projects"
                    >
                      Show {projects.length - 5} more projects...
                    </button>
                  </SidebarMenuItem>
                )}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {ungroupedConversations.length > 0 && (
          <SidebarGroup>
            <div
              onDragOver={handleDragOver}
              onDrop={(e) => {
                e.preventDefault();
                handleDrop(null);
              }}
            >
              <SidebarGroupLabel className="text-xs uppercase tracking-[0.1em]">
                Ungrouped Chats
              </SidebarGroupLabel>
            </div>
            <SidebarGroupContent>
              <SidebarMenu>
                {ungroupedConversations.map((conv) => (
                  <SidebarMenuItem key={conv.id}>
                    <div 
                      className="flex items-center justify-between w-full group"
                      draggable
                      onDragStart={() => handleDragStart(conv.id)}
                      onDragEnd={handleDragEnd}
                    >
                      <SidebarMenuButton
                        asChild
                        isActive={currentConversationId === conv.id}
                        data-testid={`conversation-item-${conv.id}`}
                        className="flex-1"
                      >
                        <button
                          onClick={() => navigate(`/chat/${conv.id}`)}
                          className="flex items-center gap-2 flex-1 min-w-0 cursor-move"
                        >
                          <MessageSquare className="h-4 w-4 flex-shrink-0" />
                          <span className="truncate">{conv.title}</span>
                        </button>
                      </SidebarMenuButton>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteConversation(e, conv.id);
                        }}
                        className="h-6 w-6 opacity-0 group-hover:opacity-100 flex-shrink-0 flex items-center justify-center hover-elevate"
                        data-testid={`button-delete-conversation-${conv.id}`}
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {projects.length === 0 && conversations.length === 0 && (
          <div className="p-4 text-sm text-muted-foreground text-center">
            No projects or conversations yet
          </div>
        )}
      </SidebarContent>

      <SidebarFooter className="p-4 border-t-2 border-border">
        <div className="text-xs text-muted-foreground text-center">
          Powered by Claude AI
        </div>
      </SidebarFooter>

      {selectedProject && (
        <ProjectDialog
          open={!!selectedProject}
          onOpenChange={(open) => !open && setSelectedProject(null)}
          project={selectedProject}
        />
      )}
    </Sidebar>
  );
}
