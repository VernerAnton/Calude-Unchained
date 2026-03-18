import { useQuery } from "@tanstack/react-query";
import { type Ledger, type LedgerVersion } from "@shared/schema";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Sandpack } from "@codesandbox/sandpack-react";
import { Skeleton } from "@/components/ui/skeleton";

export type LedgerDetail = Ledger & { latestVersion: LedgerVersion | null };

const LEDGER_TYPE_STYLES: Record<string, { border: string; text: string }> = {
  report: { border: "border-blue-500", text: "text-blue-500" },
  plan:   { border: "border-yellow-500", text: "text-yellow-500" },
  code:   { border: "border-green-500", text: "text-green-500" },
  note:   { border: "border-purple-500", text: "text-purple-500" },
  draft:  { border: "border-muted-foreground", text: "text-muted-foreground" },
};

interface LedgerViewerProps {
  ledgerId: number;
  onBack: () => void;
}

export function LedgerViewer({ ledgerId, onBack }: LedgerViewerProps) {
  const { data: ledger, isLoading, isError } = useQuery<LedgerDetail>({
    queryKey: ["/api/ledgers", ledgerId],
  });

  if (isLoading) {
    return (
      <div className="h-full flex flex-col" data-testid={`ledger-viewer-${ledgerId}`}>
        <div className="border-b-2 border-border px-3 py-2 flex-shrink-0">
          <button
            onClick={onBack}
            className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground hover-elevate"
            data-testid="button-ledger-back"
          >
            ← Back
          </button>
        </div>
        <div className="p-4 space-y-3">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/4" />
          <Skeleton className="h-3 w-full mt-4" />
          <Skeleton className="h-3 w-5/6" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-4/5" />
        </div>
      </div>
    );
  }

  if (isError || !ledger) {
    return (
      <div className="h-full flex flex-col" data-testid={`ledger-viewer-${ledgerId}`}>
        <div className="border-b-2 border-border px-3 py-2 flex-shrink-0">
          <button
            onClick={onBack}
            className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground hover-elevate"
            data-testid="button-ledger-back"
          >
            ← Back
          </button>
        </div>
        <div className="flex-1 flex items-center justify-center p-4 font-mono text-xs text-destructive text-center">
          Failed to load ledger.
        </div>
      </div>
    );
  }

  const content = ledger.latestVersion?.content ?? "";
  const style = LEDGER_TYPE_STYLES[ledger.type] ?? LEDGER_TYPE_STYLES.draft;

  return (
    <div className="h-full flex flex-col" data-testid={`ledger-viewer-${ledgerId}`}>
      {/* Title bar */}
      <div className="border-b-2 border-border px-3 py-2 flex-shrink-0 space-y-1.5">
        <button
          onClick={onBack}
          className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground hover-elevate"
          data-testid="button-ledger-back"
        >
          ← Back
        </button>
        <div className="font-mono text-sm font-semibold leading-snug">
          {ledger.title}
        </div>
        <span
          className={`inline-block text-[9px] uppercase tracking-wider border px-1.5 py-0.5 ${style.border} ${style.text}`}
        >
          {ledger.type}
        </span>
      </div>

      {/* Content area */}
      <div className="flex-1 overflow-auto">
        {ledger.type === "code" ? (
          <CodeRenderer content={content} />
        ) : (
          <MarkdownRenderer content={content} />
        )}
      </div>
    </div>
  );
}

function CodeRenderer({ content }: { content: string }) {
  return (
    <div className="h-full" style={{ minHeight: "380px" }}>
      <Sandpack
        template="react"
        theme="light"
        files={{ "/App.js": content || "export default function App() {\n  return <div>Hello World</div>;\n}" }}
        options={{
          showNavigator: false,
          showTabs: false,
          editorHeight: 240,
        }}
        customSetup={{ environment: "create-react-app" }}
      />
    </div>
  );
}

function MarkdownRenderer({ content }: { content: string }) {
  if (!content) {
    return (
      <div className="p-4 font-mono text-xs text-muted-foreground text-center py-8">
        No content yet.
      </div>
    );
  }

  return (
    <div className="p-4 prose prose-sm dark:prose-invert max-w-none prose-headings:font-mono prose-headings:uppercase prose-headings:tracking-wider prose-code:before:content-none prose-code:after:content-none prose-code:bg-muted prose-code:px-1 prose-code:py-0.5 prose-pre:bg-muted prose-pre:border-2 prose-pre:border-border prose-p:font-mono prose-li:font-mono">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
