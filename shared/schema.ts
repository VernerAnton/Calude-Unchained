import { z } from "zod";

// Chat message schema
export const messageSchema = z.object({
  id: z.string(),
  role: z.enum(["user", "assistant"]),
  content: z.string(),
  model: z.string().optional(),
  timestamp: z.number(),
});

export type Message = z.infer<typeof messageSchema>;

// Chat request schema
export const chatRequestSchema = z.object({
  message: z.string().min(1, "Message cannot be empty"),
  model: z.enum(["claude-opus-4-20250514", "claude-sonnet-4-5", "claude-haiku-4-5"]),
  conversationHistory: z.array(messageSchema).optional(),
});

export type ChatRequest = z.infer<typeof chatRequestSchema>;

// Model options for the dropdown
export const modelOptions = [
  { label: "Claude 4.1 Opus", value: "claude-opus-4-20250514" },
  { label: "Claude 4.5 Sonnet", value: "claude-sonnet-4-5" },
  { label: "Claude 4.5 Haiku", value: "claude-haiku-4-5" },
] as const;

export type ModelValue = typeof modelOptions[number]["value"];
