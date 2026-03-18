export interface ParsedLedger {
  type: string;
  title: string;
  content: string;
}

function extractAttributes(attrStr: string): { type?: string; title?: string; id?: string } {
  const typeMatch = attrStr.match(/type="([^"]+)"/);
  const titleMatch = attrStr.match(/title="([^"]+)"/);
  const idMatch = attrStr.match(/id="([^"]+)"/);
  return { type: typeMatch?.[1], title: titleMatch?.[1], id: idMatch?.[1] };
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
  id: number;
  title: string;
  type: string;
}

export function buildSentinelContent(
  rawContent: string,
  ledgerMap: Array<{ title: string; type: string; id: number }>
): string {
  let result = rawContent;
  for (const { title, type, id } of ledgerMap) {
    // Replace the first (next in sequence) <ledger> block found.
    // Using non-title-specific match so identical titles are handled by position.
    result = result.replace(
      /<ledger\s[^>]*>[\s\S]*?<\/ledger>/,
      `<ledger-ref id="${id}" type="${type}" title="${title}"/>`
    );
  }
  return result;
}

export function extractLedgerChips(content: string): {
  chips: LedgerChipInfo[];
  cleanContent: string;
} {
  const chips: LedgerChipInfo[] = [];

  let cleanContent = content.replace(
    /<ledger-ref\s([^/]+)\/>/g,
    (_match, attrs) => {
      const { id, type, title } = extractAttributes(attrs);
      const numId = id ? parseInt(id, 10) : NaN;
      if (!isNaN(numId) && type && title) {
        chips.push({ id: numId, type, title });
      }
      return "";
    }
  );

  cleanContent = cleanContent.replace(
    /<ledger\s([^>]+)>([\s\S]*?)<\/ledger>/g,
    (_match, attrs) => {
      const { type, title } = extractAttributes(attrs);
      if (type && title) {
        chips.push({ id: -1, type, title });
      }
      return "";
    }
  );

  return {
    chips,
    cleanContent: cleanContent.replace(/\n{3,}/g, "\n\n").trim(),
  };
}
