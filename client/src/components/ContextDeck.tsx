import { useState, useRef, forwardRef, useImperativeHandle } from "react";
import { useQuery } from "@tanstack/react-query";
import { type Ledger } from "@shared/schema";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LedgerViewer } from "./LedgerViewer";

export interface ContextDeckHandle {
  openLedger: (id: number) => void;
}

const LEDGER_TYPE_STYLES: Record<string, { border: string; text: string }> = {
  report: { border: "border-blue-500", text: "text-blue-500" },
  plan:   { border: "border-yellow-500", text: "text-yellow-500" },
  code:   { border: "border-green-500", text: "text-green-500" },
  note:   { border: "border-purple-500", text: "text-purple-500" },
  draft:  { border: "border-muted-foreground", text: "text-muted-foreground" },
};

function relativeTime(date: string | Date | null): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "—";
  const diffMs = Date.now() - d.getTime();
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1)  return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

interface ContextDeckProps {
  onClose: () => void;
}

export const ContextDeck = forwardRef<ContextDeckHandle, ContextDeckProps>(
  function ContextDeck({ onClose }, ref) {
    const [activeTab, setActiveTab] = useState<"ledgers" | "context">("ledgers");
    const [selectedLedgerId, setSelectedLedgerId] = useState<number | null>(null);

    const { data: ledgers = [], isLoading, isError } = useQuery<Ledger[]>({
      queryKey: ["/api/ledgers"],
      refetchInterval: 15000,
    });

    useImperativeHandle(ref, () => ({
      openLedger(id: number) {
        setActiveTab("ledgers");
        setSelectedLedgerId(id);
      },
    }));

    const handleLedgerClick = (id: number) => {
      setSelectedLedgerId(id);
    };

    const handleBack = () => {
      setSelectedLedgerId(null);
    };

    return (
      <div
        className="h-full flex flex-col border-l-2 border-border bg-background flex-shrink-0"
        style={{ width: "288px" }}
        data-testid="context-deck"
      >
        {/* Tab bar + close — always visible */}
        <div className="border-b-2 border-border px-2 py-2 flex items-center justify-between flex-shrink-0 gap-1">
          <div className="flex items-center gap-1 flex-1 min-w-0">
            <TabButton
              label="Ledgers"
              active={activeTab === "ledgers"}
              onClick={() => { setActiveTab("ledgers"); setSelectedLedgerId(null); }}
              testId="tab-ledgers"
            />
            <TabButton
              label="Context / Files"
              active={activeTab === "context"}
              onClick={() => { setActiveTab("context"); setSelectedLedgerId(null); }}
              testId="tab-context"
            />
          </div>
          <Button
            size="icon"
            variant="ghost"
            onClick={onClose}
            data-testid="button-close-context-deck"
            className="flex-shrink-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {activeTab === "ledgers" ? (
            selectedLedgerId !== null ? (
              <LedgerViewer
                ledgerId={selectedLedgerId}
                onBack={handleBack}
              />
            ) : (
              <LedgersPanel
                ledgers={ledgers}
                isLoading={isLoading}
                isError={isError}
                onLedgerClick={handleLedgerClick}
              />
            )
          ) : (
            <ContextFilesPanel />
          )}
        </div>
      </div>
    );
  }
);

function TabButton({
  label,
  active,
  onClick,
  testId,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  testId: string;
}) {
  return (
    <button
      onClick={onClick}
      data-testid={testId}
      className={[
        "font-mono text-[10px] uppercase tracking-wider px-2 py-1 border-2 transition-none whitespace-nowrap",
        active
          ? "border-border bg-card text-foreground"
          : "border-transparent text-muted-foreground hover-elevate",
      ].join(" ")}
    >
      {label}
    </button>
  );
}

function LedgersPanel({
  ledgers,
  isLoading,
  isError,
  onLedgerClick,
}: {
  ledgers: Ledger[];
  isLoading: boolean;
  isError: boolean;
  onLedgerClick: (id: number) => void;
}) {
  if (isLoading) {
    return (
      <div className="p-4 font-mono text-xs text-muted-foreground text-center py-10">
        Loading...
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-4 font-mono text-xs text-destructive text-center py-10">
        Failed to load ledgers.
      </div>
    );
  }

  if (ledgers.length === 0) {
    return (
      <div className="p-4 flex flex-col items-center justify-center py-12 gap-3 font-mono text-center">
        <div
          className="text-2xl border-2 border-border w-12 h-12 flex items-center justify-center text-muted-foreground"
          style={{ boxShadow: "2px 2px 0px hsl(var(--border))" }}
        >
          ▭
        </div>
        <div className="text-xs text-muted-foreground leading-relaxed">
          <div className="font-semibold text-foreground mb-1">No ledgers yet</div>
          <div className="opacity-70">Claude will save artifacts</div>
          <div className="opacity-70">here as you chat.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-3 space-y-2" data-testid="ledgers-list">
      {ledgers.map((ledger) => {
        const style = LEDGER_TYPE_STYLES[ledger.type] ?? LEDGER_TYPE_STYLES.note;
        return (
          <button
            key={ledger.id}
            className="w-full text-left border-2 border-border bg-card p-3 font-mono hover-elevate active-elevate-2"
            style={{ boxShadow: "2px 2px 0px hsl(var(--border))" }}
            onClick={() => onLedgerClick(ledger.id)}
            data-testid={`ledger-item-${ledger.id}`}
          >
            <div className="text-sm font-semibold leading-snug truncate mb-2">
              {ledger.title}
            </div>
            <div className="flex items-center justify-between gap-2">
              <span
                className={`text-[9px] uppercase tracking-wider border px-1.5 py-0.5 ${style.border} ${style.text} whitespace-nowrap`}
              >
                {ledger.type}
              </span>
              <span className="text-[10px] text-muted-foreground truncate">
                {relativeTime(ledger.updatedAt)}
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
}

function ContextFilesPanel() {
  return (
    <div className="p-4 flex flex-col items-center justify-center py-12 gap-3 font-mono text-center">
      <div
        className="text-2xl border-2 border-border w-12 h-12 flex items-center justify-center text-muted-foreground"
        style={{ boxShadow: "2px 2px 0px hsl(var(--border))" }}
      >
        ▨
      </div>
      <div className="text-xs text-muted-foreground leading-relaxed">
        <div className="font-semibold text-foreground mb-1">Context &amp; Files</div>
        <div className="opacity-70">Attach persistent context</div>
        <div className="opacity-70">for Claude to reference.</div>
        <div className="opacity-50 mt-2">Coming soon.</div>
      </div>
    </div>
  );
}
