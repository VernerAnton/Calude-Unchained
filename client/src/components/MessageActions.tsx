import { Edit2, RotateCcw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface MessageActionsProps {
  messageId: number;
  isUser: boolean;
  onEdit: () => void;
  onRegenerate: () => void;
  onDelete: () => void;
}

export function MessageActions({
  messageId,
  isUser,
  onEdit,
  onRegenerate,
  onDelete,
}: MessageActionsProps) {
  return (
    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
      {isUser && (
        <Button
          size="icon"
          variant="ghost"
          className="h-6 w-6"
          onClick={onEdit}
          title="Edit message"
          data-testid={`button-edit-message-${messageId}`}
        >
          <Edit2 className="h-3 w-3" />
        </Button>
      )}
      {!isUser && (
        <Button
          size="icon"
          variant="ghost"
          className="h-6 w-6"
          onClick={onRegenerate}
          title="Regenerate response"
          data-testid={`button-regenerate-message-${messageId}`}
        >
          <RotateCcw className="h-3 w-3" />
        </Button>
      )}
      <Button
        size="icon"
        variant="ghost"
        className="h-6 w-6"
        onClick={onDelete}
        title="Delete message"
        data-testid={`button-delete-message-${messageId}`}
      >
        <Trash2 className="h-3 w-3" />
      </Button>
    </div>
  );
}
