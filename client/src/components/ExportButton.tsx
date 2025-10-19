import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { type Message, type Conversation, modelOptions } from "@shared/schema";

interface ExportButtonProps {
  conversation?: Conversation | null;
  messages: Message[];
}

export function ExportButton({ conversation, messages }: ExportButtonProps) {
  const getModelLabel = (modelValue?: string | null) => {
    if (!modelValue) return "Unknown Model";
    const model = modelOptions.find(m => m.value === modelValue);
    return model ? model.label : modelValue;
  };

  const exportAsMarkdown = () => {
    if (!conversation) return;

    let markdown = `# ${conversation.title}\n\n`;
    markdown += `*Exported: ${new Date().toLocaleString()}*\n\n`;
    
    if (conversation.systemPrompt) {
      markdown += `## System Prompt\n\n${conversation.systemPrompt}\n\n`;
    }
    
    markdown += `## Conversation\n\n`;
    
    messages.forEach((msg) => {
      const role = msg.role === "user" ? "**You**" : "**Claude**";
      const model = msg.model ? ` (${getModelLabel(msg.model)})` : "";
      markdown += `### ${role}${model}\n\n${msg.content}\n\n---\n\n`;
    });

    downloadFile(markdown, `${conversation.title}.md`, "text/markdown");
  };

  const exportAsText = () => {
    if (!conversation) return;

    let text = `${conversation.title}\n`;
    text += `${"=".repeat(conversation.title.length)}\n\n`;
    text += `Exported: ${new Date().toLocaleString()}\n\n`;
    
    if (conversation.systemPrompt) {
      text += `SYSTEM PROMPT:\n${conversation.systemPrompt}\n\n`;
      text += `${"-".repeat(50)}\n\n`;
    }
    
    messages.forEach((msg) => {
      const role = msg.role === "user" ? "YOU" : "CLAUDE";
      const model = msg.model ? ` (${getModelLabel(msg.model)})` : "";
      text += `[${role}${model}]\n${msg.content}\n\n`;
    });

    downloadFile(text, `${conversation.title}.txt`, "text/plain");
  };

  const downloadFile = (content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (!conversation || messages.length === 0) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          data-testid="button-export"
          title="Export conversation"
        >
          <Download className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem onClick={exportAsMarkdown} data-testid="export-markdown">
          <Download className="mr-2 h-4 w-4" />
          EXPORT AS MARKDOWN
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportAsText} data-testid="export-text">
          <Download className="mr-2 h-4 w-4" />
          EXPORT AS TEXT
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
