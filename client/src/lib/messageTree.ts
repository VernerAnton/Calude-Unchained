import { type Message } from "@shared/schema";

export interface MessageNode {
  message: Message;
  children: MessageNode[];
  siblings: Message[];
  siblingIndex: number;
}

export const ROOT_PARENT_KEY = -1;

export interface BranchSelection {
  [parentId: number]: number;
}

export function normalizeParentId(parentId: number | null | undefined): number {
  return parentId ?? ROOT_PARENT_KEY;
}

export function buildMessageTree(messages: Message[], includeThreadMessages: boolean = false): Map<number, Message[]> {
  const tree = new Map<number, Message[]>();
  
  for (const msg of messages) {
    // Skip thread messages unless explicitly requested
    if (!includeThreadMessages && msg.isThreadMessage) {
      continue;
    }
    const parentId = normalizeParentId(msg.parentMessageId);
    if (!tree.has(parentId)) {
      tree.set(parentId, []);
    }
    tree.get(parentId)!.push(msg);
  }
  
  tree.forEach((children) => {
    children.sort((a: Message, b: Message) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  });
  
  return tree;
}

export function getSiblings(messages: Message[], message: Message, includeThreadMessages: boolean = false): Message[] {
  const parentId = normalizeParentId(message.parentMessageId);
  return messages
    .filter(m => {
      // Skip thread messages unless explicitly requested
      if (!includeThreadMessages && m.isThreadMessage) {
        return false;
      }
      return normalizeParentId(m.parentMessageId) === parentId;
    })
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
}

export function getActivePath(
  messages: Message[],
  branchSelections: BranchSelection
): Message[] {
  const tree = buildMessageTree(messages);
  const path: Message[] = [];
  
  let currentParentKey: number = ROOT_PARENT_KEY;
  
  while (true) {
    const children = tree.get(currentParentKey);
    if (!children || children.length === 0) break;
    
    const selectedIndex = branchSelections[currentParentKey] ?? 0;
    const clampedIndex = Math.min(Math.max(0, selectedIndex), children.length - 1);
    const selectedChild = children[clampedIndex];
    
    path.push(selectedChild);
    currentParentKey = selectedChild.id;
  }
  
  return path;
}

export function findLastMessageInPath(path: Message[]): Message | null {
  return path.length > 0 ? path[path.length - 1] : null;
}

export function getParentMessage(messages: Message[], message: Message): Message | null {
  if (!message.parentMessageId) return null;
  return messages.find(m => m.id === message.parentMessageId) ?? null;
}

export function getThreadMessages(
  messages: Message[],
  rootMessageId: number,
  branchSelections: BranchSelection
): Message[] {
  // Include thread messages when building thread view
  const tree = buildMessageTree(messages, true);
  const path: Message[] = [];
  
  const rootMessage = messages.find(m => m.id === rootMessageId);
  if (!rootMessage) return [];
  
  path.push(rootMessage);
  
  let currentParentId: number | null = rootMessageId;
  
  while (true) {
    const children = tree.get(currentParentId);
    if (!children || children.length === 0) break;
    
    // Only include thread messages that are actually thread messages (for this thread)
    const threadChildren = children.filter(c => c.isThreadMessage);
    if (threadChildren.length === 0) break;
    
    const selectedIndex = branchSelections[currentParentId] ?? 0;
    const clampedIndex = Math.min(Math.max(0, selectedIndex), threadChildren.length - 1);
    const selectedChild = threadChildren[clampedIndex];
    
    path.push(selectedChild);
    currentParentId = selectedChild.id;
  }
  
  return path;
}

export function hasBranches(messages: Message[], message: Message): boolean {
  const siblings = getSiblings(messages, message);
  return siblings.length > 1;
}
