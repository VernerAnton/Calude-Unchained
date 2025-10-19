import { type Message, modelOptions } from "@shared/schema";

interface ChatMessageProps {
  message: Message;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === "user";
  
  const getModelLabel = (modelValue?: string | null) => {
    if (!modelValue) return "";
    const model = modelOptions.find(m => m.value === modelValue);
    return model ? model.label : modelValue;
  };

  return (
    <div
      className={`flex ${isUser ? "justify-end" : "justify-start"} mb-6`}
      data-testid={`message-${message.role}-${message.id}`}
    >
      <div
        className={`max-w-[85%] sm:max-w-[75%] border-2 border-border p-4 ${
          isUser
            ? "bg-card text-card-foreground"
            : "bg-card text-card-foreground shadow-md"
        }`}
        style={{
          boxShadow: isUser ? "none" : "4px 4px 0px hsl(var(--border))",
        }}
      >
        <div className="flex items-center gap-2 mb-2 text-xs opacity-70 uppercase tracking-wider">
          <span>{isUser ? "[ YOU ]" : "[ CLAUDE ]"}</span>
          {message.model && !isUser && (
            <span className="text-[10px]" data-testid={`model-label-${message.id}`}>
              • {getModelLabel(message.model)}
            </span>
          )}
        </div>
        <div 
          className="whitespace-pre-wrap break-words leading-relaxed"
          data-testid={`text-message-content-${message.id}`}
        >
          {message.content}
        </div>
      </div>
    </div>
  );
}
