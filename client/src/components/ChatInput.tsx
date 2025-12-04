import { useState, useRef, useEffect } from "react";

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled: boolean;
  placeholder?: string;
  testIdPrefix?: string;
}

export function ChatInput({ onSend, disabled, placeholder = "Type your message here...", testIdPrefix = "" }: ChatInputProps) {
  const [message, setMessage] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [message]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && !disabled) {
      onSend(message.trim());
      setMessage("");
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-4">
      <textarea
        ref={textareaRef}
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        className="flex-1 border-2 border-border bg-card text-card-foreground p-4 font-mono resize-none shadow-md focus:outline-none focus:ring-2 focus:ring-border disabled:opacity-60"
        style={{ 
          boxShadow: "4px 4px 0px hsl(var(--border))",
          minHeight: "60px",
          maxHeight: "120px"
        }}
        data-testid={`${testIdPrefix}input-message`}
      />
      <button
        type="submit"
        disabled={disabled || !message.trim()}
        className="border-2 border-border bg-card text-card-foreground px-6 font-bold uppercase tracking-wider transition-all hover-elevate active-elevate-2 shadow-md disabled:opacity-60 disabled:cursor-not-allowed self-end"
        style={{ boxShadow: "4px 4px 0px hsl(var(--border))" }}
        data-testid={`${testIdPrefix}button-send`}
      >
        <span className="hidden sm:inline">▌ SEND</span>
        <span className="sm:hidden">▌</span>
      </button>
    </form>
  );
}
