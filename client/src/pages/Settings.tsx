import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Settings as SettingsIcon, ChevronLeft, Monitor, Sun, Moon, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { type Settings, modelOptions } from "@shared/schema";
import { SidebarTrigger } from "@/components/ui/sidebar";

export default function SettingsPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const { data: settings, isLoading } = useQuery<Settings>({
    queryKey: ["/api/settings"],
  });

  const updateSettingsMutation = useMutation({
    mutationFn: async (updates: Partial<Settings>) => {
      const response = await apiRequest("/api/settings", {
        method: "PATCH",
        body: JSON.stringify(updates),
      });
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update settings",
        variant: "destructive",
      });
    },
  });

  const deleteAllConversationsMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("/api/conversations", {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      setDeleteDialogOpen(false);
      toast({
        title: "Success",
        description: "All conversations have been deleted",
      });
      navigate("/");
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete conversations",
        variant: "destructive",
      });
    },
  });

  const handleUpdateSetting = (key: keyof Settings, value: string | boolean) => {
    updateSettingsMutation.mutate({ [key]: value });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="font-mono text-muted-foreground uppercase tracking-wider">Loading...</div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="border-b-2 border-border px-4 py-3 flex items-center gap-3 flex-shrink-0">
        <SidebarTrigger data-testid="button-sidebar-toggle" />
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/")}
          data-testid="button-back"
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <div className="flex items-center gap-3">
          <SettingsIcon className="h-6 w-6" />
          <h1 className="font-mono text-2xl uppercase tracking-wider font-bold">Settings</h1>
        </div>
      </div>
      <div className="flex-1 overflow-auto">
      <div className="max-w-2xl mx-auto p-6">

        <div className="space-y-6">
          <div className="border-2 border-border p-6" style={{ boxShadow: "4px 4px 0px hsl(var(--border))" }}>
            <h2 className="font-mono text-sm uppercase tracking-wider font-bold mb-4 text-muted-foreground">
              [ Default Model ]
            </h2>
            <div className="space-y-3">
              <Label htmlFor="default-model" className="font-mono text-sm uppercase tracking-wider">
                Choose default AI model for new conversations
              </Label>
              <Select
                value={settings?.defaultModel || "claude-sonnet-4-5"}
                onValueChange={(value) => handleUpdateSetting("defaultModel", value)}
                data-testid="select-default-model"
              >
                <SelectTrigger id="default-model" className="w-full font-mono" data-testid="select-trigger-default-model">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {modelOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value} className="font-mono">
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="border-2 border-border p-6" style={{ boxShadow: "4px 4px 0px hsl(var(--border))" }}>
            <h2 className="font-mono text-sm uppercase tracking-wider font-bold mb-4 text-muted-foreground">
              [ Theme ]
            </h2>
            <div className="space-y-3">
              <Label className="font-mono text-sm uppercase tracking-wider">
                Choose your preferred appearance
              </Label>
              <div className="grid grid-cols-3 gap-3">
                <Button
                  variant={settings?.theme === "system" ? "default" : "outline"}
                  className="flex flex-col gap-2 h-auto py-4"
                  onClick={() => handleUpdateSetting("theme", "system")}
                  data-testid="button-theme-system"
                >
                  <Monitor className="h-5 w-5" />
                  <span className="font-mono text-xs uppercase tracking-wider">System</span>
                </Button>
                <Button
                  variant={settings?.theme === "light" ? "default" : "outline"}
                  className="flex flex-col gap-2 h-auto py-4"
                  onClick={() => handleUpdateSetting("theme", "light")}
                  data-testid="button-theme-light"
                >
                  <Sun className="h-5 w-5" />
                  <span className="font-mono text-xs uppercase tracking-wider">Light</span>
                </Button>
                <Button
                  variant={settings?.theme === "dark" ? "default" : "outline"}
                  className="flex flex-col gap-2 h-auto py-4"
                  onClick={() => handleUpdateSetting("theme", "dark")}
                  data-testid="button-theme-dark"
                >
                  <Moon className="h-5 w-5" />
                  <span className="font-mono text-xs uppercase tracking-wider">Dark</span>
                </Button>
              </div>
            </div>
          </div>

          <div className="border-2 border-border p-6" style={{ boxShadow: "4px 4px 0px hsl(var(--border))" }}>
            <h2 className="font-mono text-sm uppercase tracking-wider font-bold mb-4 text-muted-foreground">
              [ Auto Title ]
            </h2>
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="auto-title" className="font-mono text-sm uppercase tracking-wider">
                  Automatically generate titles
                </Label>
                <p className="font-mono text-xs text-muted-foreground">
                  Let Claude suggest a title based on your first message
                </p>
              </div>
              <Switch
                id="auto-title"
                checked={settings?.autoTitle ?? true}
                onCheckedChange={(checked) => handleUpdateSetting("autoTitle", checked)}
                data-testid="switch-auto-title"
              />
            </div>
          </div>

          <div className="border-2 border-border p-6" style={{ boxShadow: "4px 4px 0px hsl(var(--border))" }}>
            <h2 className="font-mono text-sm uppercase tracking-wider font-bold mb-4 text-muted-foreground">
              [ Font Size ]
            </h2>
            <div className="space-y-3">
              <Label className="font-mono text-sm uppercase tracking-wider">
                Adjust text size throughout the app
              </Label>
              <div className="grid grid-cols-3 gap-3">
                <Button
                  variant={settings?.fontSize === "small" ? "default" : "outline"}
                  className="font-mono"
                  onClick={() => handleUpdateSetting("fontSize", "small")}
                  data-testid="button-fontsize-small"
                >
                  <span className="text-xs uppercase tracking-wider">Small</span>
                </Button>
                <Button
                  variant={settings?.fontSize === "medium" ? "default" : "outline"}
                  className="font-mono"
                  onClick={() => handleUpdateSetting("fontSize", "medium")}
                  data-testid="button-fontsize-medium"
                >
                  <span className="text-sm uppercase tracking-wider">Medium</span>
                </Button>
                <Button
                  variant={settings?.fontSize === "large" ? "default" : "outline"}
                  className="font-mono"
                  onClick={() => handleUpdateSetting("fontSize", "large")}
                  data-testid="button-fontsize-large"
                >
                  <span className="text-base uppercase tracking-wider">Large</span>
                </Button>
              </div>
            </div>
          </div>

          <div className="border-2 border-destructive/50 p-6" style={{ boxShadow: "4px 4px 0px hsl(var(--destructive) / 0.5)" }}>
            <h2 className="font-mono text-sm uppercase tracking-wider font-bold mb-4 text-destructive">
              [ Danger Zone ]
            </h2>
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label className="font-mono text-sm uppercase tracking-wider">
                  Delete all conversations
                </Label>
                <p className="font-mono text-xs text-muted-foreground">
                  This action cannot be undone
                </p>
              </div>
              <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm" data-testid="button-delete-all">
                    <Trash2 className="h-4 w-4 mr-2" />
                    <span className="font-mono text-xs uppercase tracking-wider">Delete All</span>
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle className="font-mono uppercase tracking-wider">
                      Delete All Conversations?
                    </AlertDialogTitle>
                    <AlertDialogDescription className="font-mono">
                      This will permanently delete all your conversations and messages. 
                      This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel className="font-mono uppercase tracking-wider" data-testid="button-cancel-delete">
                      Cancel
                    </AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => deleteAllConversationsMutation.mutate()}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90 font-mono uppercase tracking-wider"
                      data-testid="button-confirm-delete"
                    >
                      {deleteAllConversationsMutation.isPending ? "Deleting..." : "Delete All"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}
