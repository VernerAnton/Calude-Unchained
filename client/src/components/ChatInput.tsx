import { useState, useRef, useEffect } from "react";
import { Paperclip, X, File, Image, FileText, FileCode, Library, GitBranch, ArrowUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { FileAttachment } from "@shared/schema";

const ACCEPTED_FILE_TYPES = {
  images: [".png", ".jpg", ".jpeg", ".gif", ".webp"],
  documents: [".pdf"],
  text: [".txt", ".md", ".markdown"],
  code: [".js", ".jsx", ".ts", ".tsx", ".py", ".java", ".cpp", ".c", ".go", ".rb", ".php", ".swift", ".rs", ".html", ".css", ".scss", ".sql"],
  data: [".json", ".xml", ".yaml", ".yml", ".csv", ".toml"],
  config: [".env", ".gitignore", ".dockerfile", ".sh"],
};

const ALL_ACCEPTED_EXTENSIONS = [
  ...ACCEPTED_FILE_TYPES.images,
  ...ACCEPTED_FILE_TYPES.documents,
  ...ACCEPTED_FILE_TYPES.text,
  ...ACCEPTED_FILE_TYPES.code,
  ...ACCEPTED_FILE_TYPES.data,
  ...ACCEPTED_FILE_TYPES.config,
];

interface ChatInputProps {
  onSend: (message: string, files?: FileAttachment[]) => void;
  disabled: boolean;
  placeholder?: string;
  testIdPrefix?: string;
  initialValue?: string;
  onDraftChange?: (draft: string) => void;
}

interface PendingFile {
  file: File;
  preview?: string;
  base64?: string;
}

interface UsageIntensity {
  level: "learning" | "low" | "medium" | "high" | "veryHigh";
  label: string;
  todayCost: number;
  thisMonthCost: number;
}

function formatCurrency(amount: number): string {
  if (amount < 0.01) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 4,
      maximumFractionDigits: 4,
    }).format(amount);
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function getIntensityColor(level: string): { border: string; text: string } {
  switch (level) {
    case "low":
      return { border: "border-green-500", text: "text-green-500" };
    case "medium":
      return { border: "border-yellow-500", text: "text-yellow-500" };
    case "high":
      return { border: "border-red-500", text: "text-red-500" };
    case "veryHigh":
      return { border: "border-purple-500", text: "text-purple-500" };
    case "learning":
    default:
      return { border: "border-muted-foreground", text: "text-muted-foreground" };
  }
}

function getFileIcon(mimeType: string) {
  if (mimeType.startsWith("image/")) {
    return <Image className="w-4 h-4" />;
  } else if (mimeType === "application/pdf") {
    return <File className="w-4 h-4" />;
  } else if (mimeType.includes("javascript") || mimeType.includes("typescript") || mimeType.includes("json") || mimeType.includes("xml")) {
    return <FileCode className="w-4 h-4" />;
  }
  return <FileText className="w-4 h-4" />;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

const COCKPIT_BTN_SIZE = 52;

export function ChatInput({ onSend, disabled, placeholder = "Type your message here...", testIdPrefix = "", initialValue = "", onDraftChange }: ChatInputProps) {
  const [message, setMessage] = useState(initialValue);
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const lastInitialValueRef = useRef(initialValue);

  const { data: intensity } = useQuery<UsageIntensity>({
    queryKey: ["/api/usage/intensity"],
    refetchInterval: 30000,
  });

  useEffect(() => {
    if (initialValue !== lastInitialValueRef.current) {
      setMessage(initialValue);
      lastInitialValueRef.current = initialValue;
    }
  }, [initialValue]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      const newHeight = Math.min(Math.max(textareaRef.current.scrollHeight, COCKPIT_BTN_SIZE), 240);
      textareaRef.current.style.height = `${newHeight}px`;
    }
  }, [message]);

  const handleMessageChange = (newMessage: string) => {
    setMessage(newMessage);
    onDraftChange?.(newMessage);
  };

  const readFileAsBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.split(",")[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newPendingFiles: PendingFile[] = [];

    for (const file of Array.from(files)) {
      const extension = "." + file.name.split(".").pop()?.toLowerCase();
      if (!ALL_ACCEPTED_EXTENSIONS.includes(extension)) {
        continue;
      }

      if (file.size > 10 * 1024 * 1024) {
        continue;
      }

      const base64 = await readFileAsBase64(file);
      const preview = file.type.startsWith("image/") ? URL.createObjectURL(file) : undefined;

      newPendingFiles.push({ file, preview, base64 });
    }

    setPendingFiles(prev => [...prev, ...newPendingFiles]);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const removeFile = (index: number) => {
    setPendingFiles(prev => {
      const newFiles = [...prev];
      if (newFiles[index].preview) {
        URL.revokeObjectURL(newFiles[index].preview!);
      }
      newFiles.splice(index, 1);
      return newFiles;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!message.trim() && pendingFiles.length === 0) || disabled) return;

    const fileAttachments: FileAttachment[] = pendingFiles.map(pf => ({
      filename: pf.file.name,
      originalName: pf.file.name,
      mimeType: pf.file.type || "application/octet-stream",
      size: pf.file.size,
      data: pf.base64 || "",
    }));

    onSend(message.trim() || "Please analyze the attached file(s).", fileAttachments.length > 0 ? fileAttachments : undefined);
    setMessage("");
    pendingFiles.forEach(pf => {
      if (pf.preview) URL.revokeObjectURL(pf.preview);
    });
    setPendingFiles([]);
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const colors = intensity ? getIntensityColor(intensity.level) : getIntensityColor("learning");
  const showIntensity = intensity && (intensity.todayCost > 0 || intensity.thisMonthCost > 0 || intensity.level === "learning");

  return (
    <div className="space-y-3">
      {/* File previews */}
      {pendingFiles.length > 0 && (
        <div className="flex flex-wrap gap-2" data-testid={`${testIdPrefix}file-previews`}>
          {pendingFiles.map((pf, index) => (
            <div
              key={index}
              className="relative flex items-center gap-2 border-2 border-border bg-card px-3 py-2 font-mono text-sm"
              style={{ boxShadow: "2px 2px 0px hsl(var(--border))" }}
              data-testid={`${testIdPrefix}file-preview-${index}`}
            >
              {pf.preview ? (
                <img src={pf.preview} alt={pf.file.name} className="w-8 h-8 object-cover" />
              ) : (
                getFileIcon(pf.file.type)
              )}
              <div className="max-w-[150px]">
                <div className="truncate text-xs font-semibold">{pf.file.name}</div>
                <div className="text-xs text-muted-foreground">{formatFileSize(pf.file.size)}</div>
              </div>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="h-5 w-5 p-0 hover:bg-destructive/20"
                onClick={() => removeFile(index)}
                data-testid={`${testIdPrefix}button-remove-file-${index}`}
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Cockpit form: [Left Col] [Textarea] [Right Col] */}
      <form onSubmit={handleSubmit} className="flex gap-3 items-start">
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={ALL_ACCEPTED_EXTENSIONS.join(",")}
          onChange={handleFileSelect}
          className="hidden"
          data-testid={`${testIdPrefix}input-file`}
        />

        {/* Left column — Attach + Library */}
        <div className="flex flex-col gap-2 flex-shrink-0">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled}
            className="border-2 border-border bg-card text-card-foreground flex items-center justify-center hover-elevate active-elevate-2 disabled:opacity-60 disabled:cursor-not-allowed"
            style={{
              boxShadow: "4px 4px 0px hsl(var(--border))",
              width: `${COCKPIT_BTN_SIZE}px`,
              height: `${COCKPIT_BTN_SIZE}px`,
            }}
            data-testid={`${testIdPrefix}button-attach-file`}
            title="Attach file"
          >
            <Paperclip className="w-5 h-5" />
          </button>
          <button
            type="button"
            disabled
            className="border-2 border-border bg-card text-muted-foreground flex items-center justify-center opacity-35 cursor-not-allowed"
            style={{
              boxShadow: "2px 2px 0px hsl(var(--border))",
              width: `${COCKPIT_BTN_SIZE}px`,
              height: `${COCKPIT_BTN_SIZE}px`,
            }}
            data-testid={`${testIdPrefix}button-library`}
            title="Library (coming soon)"
          >
            <Library className="w-4 h-4" />
          </button>
        </div>

        {/* Center — auto-growing textarea */}
        <textarea
          ref={textareaRef}
          value={message}
          onChange={(e) => handleMessageChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          className="flex-1 border-2 border-border bg-card text-card-foreground p-4 font-mono resize-none focus:outline-none focus:ring-2 focus:ring-border disabled:opacity-60"
          style={{
            boxShadow: "4px 4px 0px hsl(var(--border))",
            minHeight: `${COCKPIT_BTN_SIZE}px`,
            maxHeight: "240px",
          }}
          data-testid={`${testIdPrefix}input-message`}
        />

        {/* Right column — Usage chip + [Send | Branch] row */}
        <div className="flex flex-col items-end gap-2 flex-shrink-0">
          {showIntensity && (
            <Tooltip>
              <TooltipTrigger asChild>
                <div
                  className={`font-mono text-xs uppercase tracking-wider px-2 py-1 border-2 ${colors.border} ${colors.text} bg-transparent cursor-default whitespace-nowrap`}
                  data-testid="usage-intensity-chip"
                >
                  {intensity.level === "learning" ? "Learning..." : intensity.label.replace("Usage: ", "")}
                </div>
              </TooltipTrigger>
              <TooltipContent side="top" className="font-mono text-xs">
                {intensity.level === "learning" ? (
                  <p>Usage levels adapt after a few active sessions.</p>
                ) : (
                  <div className="space-y-1">
                    <div>Today: {formatCurrency(intensity.todayCost)}</div>
                    <div>This month: {formatCurrency(intensity.thisMonthCost)}</div>
                  </div>
                )}
              </TooltipContent>
            </Tooltip>
          )}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={disabled || (!message.trim() && pendingFiles.length === 0)}
              className="border-2 border-border bg-card text-card-foreground flex items-center justify-center hover-elevate active-elevate-2 disabled:opacity-60 disabled:cursor-not-allowed"
              style={{
                boxShadow: "4px 4px 0px hsl(var(--border))",
                width: `${COCKPIT_BTN_SIZE}px`,
                height: `${COCKPIT_BTN_SIZE}px`,
              }}
              data-testid={`${testIdPrefix}button-send`}
              title="Send message"
            >
              <ArrowUp className="w-5 h-5" />
            </button>
            <button
              type="button"
              disabled
              className="border-2 border-border bg-card text-muted-foreground flex items-center justify-center opacity-35 cursor-not-allowed"
              style={{
                boxShadow: "2px 2px 0px hsl(var(--border))",
                width: `${COCKPIT_BTN_SIZE}px`,
                height: `${COCKPIT_BTN_SIZE}px`,
              }}
              data-testid={`${testIdPrefix}button-branch`}
              title="Branch / Fork (coming soon)"
            >
              <GitBranch className="w-4 h-4" />
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
