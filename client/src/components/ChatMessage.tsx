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

export function ChatMessage({ message, onEdit, onRegenerate, onDelete }: ChatMessageProps) {
  const isUser = message.role === "user";
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(message.content);
  
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
      <div
        className={`max-w-[75%] p-4 ${
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-muted"
        }`}
      >
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
          <div 
            className="whitespace-pre-wrap break-words leading-relaxed"
            data-testid={`text-message-content-${message.id}`}
          >
            {message.content}
          </div>
        )}
      </div>
    </div>
  );
}
