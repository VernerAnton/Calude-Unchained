export interface ParsedLedger {
  type: string;
  title: string;
  content: string;
}

function extractAttributes(attrStr: string): { type?: string; title?: string } {
  const typeMatch = attrStr.match(/type="([^"]+)"/);
  const titleMatch = attrStr.match(/title="([^"]+)"/);
  return { type: typeMatch?.[1], title: titleMatch?.[1] };
}

export function parseLedgerBlocks(text: string): {
  visibleText: string;
  completeLedgers: ParsedLedger[];
} {
  const completeLedgers: ParsedLedger[] = [];

  const afterComplete = text.replace(
    /<ledger\s([^>]+)>([\s\S]*?)<\/ledger>/g,
    (_match, attrs, content) => {
      const { type, title } = extractAttributes(attrs);
      if (type && title) {
        completeLedgers.push({ type, title, content: content.trim() });
      }
      return "";
    }
  );

  const afterPartial = afterComplete.replace(/<ledger[\s\S]*$/, "");
  const visibleText = afterPartial.replace(/\n{3,}/g, "\n\n").trim();

  return { visibleText, completeLedgers };
}

export interface LedgerChipInfo {
  title: string;
  type: string;
}

export function extractLedgerChips(content: string): {
  chips: LedgerChipInfo[];
  cleanContent: string;
} {
  const chips: LedgerChipInfo[] = [];

  const cleanContent = content.replace(
    /<ledger\s([^>]+)>([\s\S]*?)<\/ledger>/g,
    (_match, attrs) => {
      const { type, title } = extractAttributes(attrs);
      if (type && title) {
        chips.push({ type, title });
      }
      return "";
    }
  );

  return {
    chips,
    cleanContent: cleanContent.replace(/\n{3,}/g, "\n\n").trim(),
  };
}
