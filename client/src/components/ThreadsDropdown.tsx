import { useMemo } from "react";
import { MessageSquareMore } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { type Message } from "@shared/schema";

interface ThreadsDropdownProps {
  messages: Message[];
  onOpenThread: (messageId: number) => void;
  conversationId?: number | null;
}

interface ThreadInfo {
  rootMessage: Message;
  threadCount: number;
}

export function ThreadsDropdown({
  messages,
  onOpenThread,
  conversationId,
}: ThreadsDropdownProps) {
  const threads = useMemo(() => {
    const threadInfos: ThreadInfo[] = [];
    
    const threadMessages = messages.filter(m => m.isThreadMessage);
    if (threadMessages.length === 0) return [];
    
    const messageMap = new Map(messages.map(m => [m.id, m]));
    
    const rootIds = new Set<number>();
    for (const tm of threadMessages) {
      if (tm.parentMessageId) {
        const directParent = messageMap.get(tm.parentMessageId);
        if (directParent && !directParent.isThreadMessage) {
          rootIds.add(directParent.id);
        }
      }
    }
    
    for (const rootId of Array.from(rootIds)) {
      const rootMessage = messageMap.get(rootId);
      if (rootMessage) {
        const count = threadMessages.filter(m => m.parentMessageId === rootId || 
          (m.parentMessageId && (() => {
            let current = messageMap.get(m.parentMessageId);
            while (current && current.isThreadMessage && current.parentMessageId) {
              if (current.parentMessageId === rootId) return true;
              current = messageMap.get(current.parentMessageId);
            }
            return current?.id === rootId;
          })())
        ).length;
        
        threadInfos.push({
          rootMessage,
          threadCount: count,
        });
      }
    }
    
    return threadInfos.sort((a, b) => 
      new Date(b.rootMessage.createdAt).getTime() - new Date(a.rootMessage.createdAt).getTime()
    );
  }, [messages]);

  if (!conversationId) {
    return null;
  }

  const hasThreads = threads.length > 0;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className={hasThreads ? "border-primary" : ""}
          data-testid="button-threads-dropdown"
          title="View Threads"
        >
          <MessageSquareMore className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <div className="space-y-2">
          <h4 className="font-bold tracking-[0.05em] text-sm">
            ══ THREADS ══
          </h4>
          {threads.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No threads yet. Click the thread button on any assistant message to start a thread.
            </p>
          ) : (
            <ScrollArea className="h-[300px]">
              <div className="space-y-2 pr-4">
                {threads.map((thread) => (
                  <button
                    key={thread.rootMessage.id}
                    onClick={() => onOpenThread(thread.rootMessage.id)}
                    className="w-full text-left p-3 border rounded-md hover-elevate active-elevate-2 transition-colors"
                    data-testid={`thread-item-${thread.rootMessage.id}`}
                  >
                    <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                      {thread.threadCount} {thread.threadCount === 1 ? "reply" : "replies"}
                    </div>
                    <p className="text-sm line-clamp-2">
                      {thread.rootMessage.content}
                    </p>
                  </button>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
