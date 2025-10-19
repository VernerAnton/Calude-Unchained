import { useState } from "react";
import { Settings } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface SystemPromptDialogProps {
  conversationId?: number | null;
  currentSystemPrompt?: string | null;
  onSave: (systemPrompt: string) => void;
}

export function SystemPromptDialog({
  conversationId,
  currentSystemPrompt,
  onSave,
}: SystemPromptDialogProps) {
  const [open, setOpen] = useState(false);
  const [systemPrompt, setSystemPrompt] = useState(currentSystemPrompt || "");

  const handleSave = () => {
    onSave(systemPrompt);
    setOpen(false);
  };

  const handleClear = () => {
    setSystemPrompt("");
  };

  if (!conversationId) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className={currentSystemPrompt ? "border-primary" : ""}
          data-testid="button-system-prompt"
          title="Custom System Prompt"
        >
          <Settings className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="font-bold tracking-[0.05em]">
            ══ SYSTEM PROMPT ══
          </DialogTitle>
          <DialogDescription className="text-sm">
            Customize how Claude behaves in this conversation. Leave empty for
            default behavior.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="system-prompt" className="uppercase tracking-wider text-xs">
              Instructions for Claude
            </Label>
            <Textarea
              id="system-prompt"
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              placeholder="e.g., You are a helpful coding assistant specialized in JavaScript..."
              className="min-h-[200px] resize-none"
              data-testid="input-system-prompt"
            />
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={handleClear}
            data-testid="button-clear-prompt"
          >
            CLEAR
          </Button>
          <Button onClick={handleSave} data-testid="button-save-prompt">
            SAVE
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
