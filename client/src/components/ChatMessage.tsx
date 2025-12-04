import { useState } from "react";
import { type Message, type MessageFile, modelOptions } from "@shared/schema";
import { MessageActions } from "./MessageActions";
import { BranchNavigator } from "./BranchNavigator";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Check, X, MessageSquarePlus, File, FileText, FileCode, Image as ImageIcon } from "lucide-react";

interface ChatMessageProps {
  message: Message;
  files?: MessageFile[];
  siblings?: Message[];
  siblingIndex?: number;
  onEdit?: (messageId: number, newContent: string) => void;
  onRegenerate?: (messageId: number) => void;
  onDelete?: (messageId: number) => void;
  onBranchNavigate?: (parentId: number | null, direction: "prev" | "next") => void;
  onOpenThread?: (messageId: number) => void;
}

function getFileIcon(mimeType: string) {
  if (mimeType.startsWith("image/")) {
    return <ImageIcon className="w-4 h-4" />;
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

// ========== ADD THESE NEW HELPER FUNCTIONS HERE ==========
const WORD_LIMIT = 50;

const countWords = (text: string): number => {
  return text.trim().split(/\s+/).length;
};

const getTruncatedText = (text: string, wordLimit: number): string => {
  const words = text.trim().split(/\s+/);
  if (words.length <= wordLimit) return text;
  return words.slice(0, wordLimit).join(" ") + "...";
};
// ========== END OF NEW HELPER FUNCTIONS ==========

export function ChatMessage({ 
  message,
  files = [],
  siblings = [],
  siblingIndex = 0,
  onEdit, 
  onRegenerate, 
  onDelete,
  onBranchNavigate,
  onOpenThread
}: ChatMessageProps) {
  const isUser = message.role === "user";
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(message.content);

  const [isExpanded, setIsExpanded] = useState(false);
  const wordCount = countWords(message.content);
  const shouldCollapse = isUser && wordCount > WORD_LIMIT && !isEditing;
  
  const hasBranches = siblings.length > 1;
  
  const handleBranchNavigate = (direction: "prev" | "next") => {
    if (onBranchNavigate) {
      onBranchNavigate(message.parentMessageId, direction);
    }
  };
  
  const handleOpenThread = () => {
    if (onOpenThread) {
      onOpenThread(message.id);
    }
  };
  
  const getModelLabel = (modelValue?: string | null) => {
    if (!modelValue) return "";
    const model = modelOptions.find(m => m.value === modelValue);
    return model ? model.label : modelValue;
  };

  const handleEdit = () => {
    setIsEditing(true);
    setEditedContent(message.content);
  };

  const handleSaveEdit = () => {
    if (editedContent.trim() && onEdit) {
      onEdit(message.id, editedContent);
      setIsEditing(false);
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditedContent(message.content);
  };

  const handleRegenerate = () => {
    if (onRegenerate) {
      onRegenerate(message.id);
    }
  };

  const handleDelete = () => {
    if (onDelete && confirm("Delete this message?")) {
      onDelete(message.id);
    }
  };

  return (
    <div
      className={`flex ${isUser ? "justify-end" : "justify-start"} mb-4 group px-4`}
      data-testid={`message-${message.role}-${message.id}`}
    >
      <div className="max-w-[75%] p-4">
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider">
            <span>{isUser ? "You" : "Claude"}</span>
            {message.model && !isUser && (
              <span className="text-[10px] opacity-70" data-testid={`model-label-${message.id}`}>
                • {getModelLabel(message.model)}
              </span>
            )}
            {hasBranches && (
              <BranchNavigator
                currentIndex={siblingIndex}
                totalCount={siblings.length}
                onNavigate={handleBranchNavigate}
              />
            )}
          </div>
          <div className="flex items-center gap-1">
            {!isUser && onOpenThread && (
              <Button
                size="icon"
                variant="ghost"
                className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={handleOpenThread}
                title="Start thread"
                data-testid={`button-thread-${message.id}`}
              >
                <MessageSquarePlus className="h-4 w-4" />
              </Button>
            )}
            {(onEdit || onRegenerate || onDelete) && !isEditing && (
              <MessageActions
                messageId={message.id}
                isUser={isUser}
                onEdit={handleEdit}
                onRegenerate={handleRegenerate}
                onDelete={handleDelete}
              />
            )}
          </div>
        </div>
        
        {isEditing ? (
          <div className="space-y-2">
            <Textarea
              value={editedContent}
              onChange={(e) => setEditedContent(e.target.value)}
              className="min-h-[100px] resize-none"
              data-testid={`input-edit-message-${message.id}`}
            />
            <div className="flex gap-2 justify-end">
              <Button
                size="sm"
                variant="outline"
                onClick={handleCancelEdit}
                data-testid={`button-cancel-edit-${message.id}`}
              >
                <X className="h-4 w-4 mr-1" />
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSaveEdit}
                disabled={!editedContent.trim()}
                data-testid={`button-save-edit-${message.id}`}
              >
                <Check className="h-4 w-4 mr-1" />
                Save
              </Button>
            </div>
          </div>
        ) : (
      <div>
        {files.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-2" data-testid={`files-${message.id}`}>
            {files.map((file) => {
              const isImage = file.mimeType.startsWith("image/");
              
              if (isImage && file.fileData) {
                return (
                  <div
                    key={file.id}
                    className="border-2 border-border overflow-hidden"
                    style={{ boxShadow: "2px 2px 0px hsl(var(--border))" }}
                    data-testid={`file-image-${file.id}`}
                  >
                    <img
                      src={`data:${file.mimeType};base64,${file.fileData}`}
                      alt={file.originalName}
                      className="max-w-[200px] max-h-[200px] object-contain"
                    />
                  </div>
                );
              }
              
              return (
                <div
                  key={file.id}
                  className="flex items-center gap-2 border-2 border-border px-3 py-2 font-mono text-xs"
                  style={{ boxShadow: "2px 2px 0px hsl(var(--border))" }}
                  data-testid={`file-attachment-${file.id}`}
                >
                  {getFileIcon(file.mimeType)}
                  <div className="max-w-[150px]">
                    <div className="truncate font-semibold">{file.originalName}</div>
                    <div className="text-muted-foreground">{formatFileSize(file.size)}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        
        <div 
          className="whitespace-pre-wrap break-words leading-relaxed"
          data-testid={`text-message-content-${message.id}`}
        >
          {shouldCollapse && !isExpanded
            ? getTruncatedText(message.content, WORD_LIMIT)
            : message.content
          }
        </div>

        {shouldCollapse && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="mt-2 text-sm text-muted-foreground hover:text-foreground transition-colors uppercase tracking-wider font-semibold"
            data-testid={`button-toggle-message-${message.id}`}
          >
            {isExpanded ? "▲ SHOW LESS" : `▼ SHOW MORE (${wordCount - WORD_LIMIT} more words)`}
          </button>
        )}
      </div>
        )}
      </div>
    </div>
  );
}
