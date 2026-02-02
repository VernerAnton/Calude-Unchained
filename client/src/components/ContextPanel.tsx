import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Plus, 
  FileText, 
  Folder, 
  Trash2, 
  Download, 
  ChevronRight,
  Clock,
  FileCode,
  ListChecks,
  ScrollText,
  StickyNote,
  Code,
  X,
  Sparkles,
  RefreshCw
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Ledger, LedgerVersion, LedgerType, MessageFile } from "@shared/schema";
import { LEDGER_TYPES } from "@shared/schema";

interface ContextPanelProps {
  conversationId?: number;
  projectId?: number;
  onClose: () => void;
}

interface LedgerWithVersions extends Ledger {
  versions?: LedgerVersion[];
}

const LEDGER_TYPE_ICONS: Record<string, typeof FileText> = {
  report: ScrollText,
  plan: FileCode,
  checklist: ListChecks,
  draft: FileText,
  notes: StickyNote,
  code: Code,
};

const LEDGER_TYPE_LABELS: Record<string, string> = {
  report: "Report",
  plan: "Plan",
  checklist: "Checklist",
  draft: "Draft",
  notes: "Notes",
  code: "Code",
};

export function ContextPanel({ conversationId, projectId, onClose }: ContextPanelProps) {
  const [selectedLedgerId, setSelectedLedgerId] = useState<number | null>(null);
  const [editingContent, setEditingContent] = useState<string>("");
  const [isCreating, setIsCreating] = useState(false);
  const [newLedgerTitle, setNewLedgerTitle] = useState("");
  const [newLedgerType, setNewLedgerType] = useState<LedgerType>("notes");
  const [showVersionHistory, setShowVersionHistory] = useState(false);

  const { data: ledgers = [], isLoading: ledgersLoading } = useQuery<Ledger[]>({
    queryKey: ["/api/ledgers", { conversationId, projectId }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (conversationId) params.append("conversation_id", conversationId.toString());
      if (projectId) params.append("project_id", projectId.toString());
      const url = `/api/ledgers${params.toString() ? `?${params}` : ""}`;
      const res = await fetch(url);
      return res.json();
    },
  });

  const { data: selectedLedger, isLoading: ledgerLoading } = useQuery<LedgerWithVersions>({
    queryKey: ["/api/ledgers", selectedLedgerId],
    enabled: !!selectedLedgerId,
  });

  const { data: messageFiles = [] } = useQuery<MessageFile[]>({
    queryKey: ["/api/conversations", conversationId, "files"],
    enabled: !!conversationId,
    queryFn: async () => {
      if (!conversationId) return [];
      const res = await fetch(`/api/conversations/${conversationId}/messages`);
      const messages = await res.json();
      const allFiles: MessageFile[] = [];
      for (const msg of messages) {
        if (msg.files) {
          allFiles.push(...msg.files);
        }
      }
      return allFiles;
    },
  });

  const createLedgerMutation = useMutation({
    mutationFn: async (data: { title: string; type: LedgerType }) => {
      return apiRequest("/api/ledgers", {
        method: "POST",
        body: JSON.stringify({
          title: data.title,
          type: data.type,
          originConversationId: conversationId,
          originProjectId: projectId,
        }),
      });
    },
    onSuccess: (newLedger: Ledger) => {
      queryClient.invalidateQueries({ queryKey: ["/api/ledgers"] });
      setIsCreating(false);
      setNewLedgerTitle("");
      setSelectedLedgerId(newLedger.id);
    },
  });

  const updateContentMutation = useMutation({
    mutationFn: async (content: string) => {
      return apiRequest(`/api/ledgers/${selectedLedgerId}/content`, {
        method: "PUT",
        body: JSON.stringify({ contentMarkdown: content }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ledgers", selectedLedgerId] });
    },
  });

  const deleteLedgerMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest(`/api/ledgers/${id}`, { method: "DELETE" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ledgers"] });
      if (selectedLedgerId === selectedLedgerId) {
        setSelectedLedgerId(null);
      }
    },
  });

  const generateFromThreadMutation = useMutation({
    mutationFn: async () => {
      return apiRequest(`/api/ledgers/${selectedLedgerId}/generate-from-thread`, {
        method: "POST",
        body: JSON.stringify({ conversationId }),
      });
    },
    onSuccess: (data: { content: string }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/ledgers", selectedLedgerId] });
      setEditingContent(data.content);
    },
  });

  const updateFromThreadMutation = useMutation({
    mutationFn: async () => {
      return apiRequest(`/api/ledgers/${selectedLedgerId}/update-from-thread`, {
        method: "POST",
        body: JSON.stringify({ conversationId }),
      });
    },
    onSuccess: (data: { content: string }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/ledgers", selectedLedgerId] });
      setEditingContent(data.content);
    },
  });

  const restoreVersionMutation = useMutation({
    mutationFn: async (versionId: number) => {
      return apiRequest(`/api/ledgers/${selectedLedgerId}/restore/${versionId}`, {
        method: "POST",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ledgers", selectedLedgerId] });
    },
  });

  const handleExport = async () => {
    if (!selectedLedgerId) return;
    const response = await fetch(`/api/ledgers/${selectedLedgerId}/export-md`, {
      method: "POST",
    });
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${selectedLedger?.title || "ledger"}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSelectLedger = (ledger: Ledger) => {
    setSelectedLedgerId(ledger.id);
    setShowVersionHistory(false);
  };

  const currentContent = selectedLedger?.versions?.[0]?.contentMarkdown || "";

  return (
    <div className="h-full flex flex-col border-l-2 border-border bg-card" data-testid="context-panel">
      <div className="flex items-center justify-between px-4 py-3 border-b-2 border-border">
        <h2 className="font-mono font-bold uppercase tracking-wider text-sm">Context</h2>
        <Button
          size="icon"
          variant="ghost"
          onClick={onClose}
          data-testid="button-close-context-panel"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>

      <Tabs defaultValue="ledgers" className="flex-1 flex flex-col overflow-hidden">
        <TabsList className="mx-4 mt-2 grid w-auto grid-cols-2 bg-muted">
          <TabsTrigger value="ledgers" className="font-mono text-xs uppercase" data-testid="tab-ledgers">
            Ledgers
          </TabsTrigger>
          <TabsTrigger value="files" className="font-mono text-xs uppercase" data-testid="tab-files">
            Files
          </TabsTrigger>
        </TabsList>

        <TabsContent value="ledgers" className="flex-1 overflow-hidden flex flex-col m-0 p-4">
          {!selectedLedgerId ? (
            <div className="flex-1 flex flex-col gap-3 overflow-hidden">
              {isCreating ? (
                <div className="space-y-3 p-3 border-2 border-border bg-background">
                  <Input
                    placeholder="Ledger title..."
                    value={newLedgerTitle}
                    onChange={(e) => setNewLedgerTitle(e.target.value)}
                    className="font-mono"
                    data-testid="input-new-ledger-title"
                  />
                  <Select value={newLedgerType} onValueChange={(v) => setNewLedgerType(v as LedgerType)}>
                    <SelectTrigger className="font-mono" data-testid="select-ledger-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {LEDGER_TYPES.map((type) => (
                        <SelectItem key={type} value={type} className="font-mono">
                          {LEDGER_TYPE_LABELS[type]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => createLedgerMutation.mutate({ title: newLedgerTitle, type: newLedgerType })}
                      disabled={!newLedgerTitle.trim() || createLedgerMutation.isPending}
                      className="font-mono text-xs"
                      data-testid="button-create-ledger"
                    >
                      Create
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setIsCreating(false)}
                      className="font-mono text-xs"
                      data-testid="button-cancel-create"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  variant="outline"
                  className="w-full font-mono text-xs border-2 border-dashed"
                  onClick={() => setIsCreating(true)}
                  data-testid="button-new-ledger"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  New Ledger
                </Button>
              )}

              <ScrollArea className="flex-1">
                <div className="space-y-2">
                  {ledgersLoading ? (
                    <p className="text-sm text-muted-foreground font-mono">Loading...</p>
                  ) : ledgers.length === 0 ? (
                    <p className="text-sm text-muted-foreground font-mono">No ledgers yet</p>
                  ) : (
                    ledgers.map((ledger) => {
                      const Icon = LEDGER_TYPE_ICONS[ledger.type] || FileText;
                      return (
                        <button
                          key={ledger.id}
                          onClick={() => handleSelectLedger(ledger)}
                          className="w-full flex items-center gap-3 p-3 border-2 border-border hover-elevate text-left font-mono text-sm"
                          data-testid={`ledger-item-${ledger.id}`}
                        >
                          <Icon className="w-4 h-4 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="truncate font-semibold">{ledger.title}</div>
                            <div className="text-xs text-muted-foreground uppercase">{ledger.type}</div>
                          </div>
                          <ChevronRight className="w-4 h-4 flex-shrink-0 text-muted-foreground" />
                        </button>
                      );
                    })
                  )}
                </div>
              </ScrollArea>
            </div>
          ) : (
            <div className="flex-1 flex flex-col gap-3 overflow-hidden">
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setSelectedLedgerId(null)}
                  className="font-mono text-xs"
                  data-testid="button-back-to-list"
                >
                  Back
                </Button>
                <span className="flex-1 font-mono font-semibold truncate text-sm">
                  {selectedLedger?.title}
                </span>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => setShowVersionHistory(!showVersionHistory)}
                  title="Version history"
                  data-testid="button-toggle-versions"
                >
                  <Clock className="w-4 h-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={handleExport}
                  title="Export as Markdown"
                  data-testid="button-export-ledger"
                >
                  <Download className="w-4 h-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => {
                    if (selectedLedgerId && confirm("Delete this ledger?")) {
                      deleteLedgerMutation.mutate(selectedLedgerId);
                    }
                  }}
                  title="Delete"
                  data-testid="button-delete-ledger"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>

              {showVersionHistory && selectedLedger?.versions && (
                <div className="border-2 border-border p-3 bg-background space-y-2">
                  <h3 className="font-mono text-xs uppercase font-semibold">Version History</h3>
                  <ScrollArea className="max-h-32">
                    <div className="space-y-1">
                      {selectedLedger.versions.map((version) => (
                        <div
                          key={version.id}
                          className="flex items-center justify-between text-xs font-mono p-2 hover:bg-muted"
                        >
                          <span>v{version.versionNumber}</span>
                          <span className="text-muted-foreground">
                            {new Date(version.createdAt).toLocaleDateString()}
                          </span>
                          {version.id !== selectedLedger.currentVersionId && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 text-xs"
                              onClick={() => restoreVersionMutation.mutate(version.id)}
                              disabled={restoreVersionMutation.isPending}
                              data-testid={`button-restore-version-${version.id}`}
                            >
                              Restore
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              )}

              {conversationId && (
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 font-mono text-xs"
                    onClick={() => generateFromThreadMutation.mutate()}
                    disabled={generateFromThreadMutation.isPending}
                    data-testid="button-generate-from-thread"
                  >
                    <Sparkles className="w-3 h-3 mr-1" />
                    {currentContent ? "Regenerate" : "Generate"}
                  </Button>
                  {currentContent && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 font-mono text-xs"
                      onClick={() => updateFromThreadMutation.mutate()}
                      disabled={updateFromThreadMutation.isPending}
                      data-testid="button-update-from-thread"
                    >
                      <RefreshCw className="w-3 h-3 mr-1" />
                      Update
                    </Button>
                  )}
                </div>
              )}

              <ScrollArea className="flex-1">
                <textarea
                  value={editingContent || currentContent}
                  onChange={(e) => setEditingContent(e.target.value)}
                  className="w-full h-full min-h-[300px] p-3 font-mono text-sm bg-transparent border-2 border-border resize-none focus:outline-none focus:ring-2 focus:ring-border"
                  placeholder="Ledger content..."
                  data-testid="textarea-ledger-content"
                />
              </ScrollArea>

              {editingContent && editingContent !== currentContent && (
                <Button
                  size="sm"
                  onClick={() => updateContentMutation.mutate(editingContent)}
                  disabled={updateContentMutation.isPending}
                  className="font-mono text-xs"
                  data-testid="button-save-content"
                >
                  Save Changes
                </Button>
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="files" className="flex-1 overflow-hidden flex flex-col m-0 p-4">
          <ScrollArea className="flex-1">
            <div className="space-y-2">
              {messageFiles.length === 0 ? (
                <p className="text-sm text-muted-foreground font-mono">No files in this conversation</p>
              ) : (
                messageFiles.map((file, index) => (
                  <div
                    key={file.id || index}
                    className="flex items-center gap-3 p-3 border-2 border-border font-mono text-sm"
                  >
                    <Folder className="w-4 h-4 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="truncate">{file.originalName}</div>
                      <div className="text-xs text-muted-foreground">{file.mimeType}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
}
