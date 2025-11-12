import { useState } from "react";
import { type Message, modelOptions } from "@shared/schema";
import { MessageActions } from "./MessageActions";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Check, X } from "lucide-react";

interface ChatMessageProps {
  message: Message;
  onEdit?: (messageId: number, newContent: string) => void;
  onRegenerate?: (messageId: number) => void;
  onDelete?: (messageId: number) => void;
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

export function ChatMessage({ message, onEdit, onRegenerate, onDelete }: ChatMessageProps) {
  const isUser = message.role === "user";
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(message.content);

  // ========== ADD THESE NEW LINES HERE ==========
  const [isExpanded, setIsExpanded] = useState(false);
  const wordCount = countWords(message.content);
  const shouldCollapse = isUser && wordCount > WORD_LIMIT && !isEditing;
  // ========== END OF NEW LINES ==========
  
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
          </div>
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
