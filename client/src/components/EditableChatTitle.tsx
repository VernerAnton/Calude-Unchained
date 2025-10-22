import { useState, useRef, useEffect } from "react";

interface EditableChatTitleProps {
  title: string;
  onSave: (newTitle: string) => void;
  disabled?: boolean;
}

export function EditableChatTitle({ title, onSave, disabled = false }: EditableChatTitleProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(title);
  const inputRef = useRef<HTMLInputElement>(null);

  // Update editValue when title prop changes
  useEffect(() => {
    setEditValue(title);
  }, [title]);

  // Focus input when entering edit mode
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleSave = () => {
    const trimmedValue = editValue.trim();
    if (trimmedValue && trimmedValue !== title) {
      onSave(trimmedValue);
    } else {
      setEditValue(title); // Reset to original if empty or unchanged
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSave();
    } else if (e.key === "Escape") {
      setEditValue(title); // Reset to original
      setIsEditing(false);
    }
  };

  const handleBlur = () => {
    handleSave();
  };

  const handleClick = () => {
    if (!disabled) {
      setIsEditing(true);
    }
  };

  if (isEditing) {
    return (
      <input
        ref={inputRef}
        type="text"
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        className="text-lg font-bold tracking-wide bg-transparent border-b-2 border-border px-2 py-1 focus:outline-none focus:border-foreground"
        disabled={disabled}
      />
    );
  }

  return (
    <h1
      className="text-lg font-bold tracking-wide cursor-pointer hover:text-muted-foreground transition-colors"
      onClick={handleClick}
      title="Click to edit title"
    >
      {title}
    </h1>
  );
}
