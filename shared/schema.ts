import { pgTable, text, varchar, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const conversations = pgTable("conversations", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  title: varchar("title", { length: 255 }).notNull(),
  systemPrompt: text("system_prompt"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const messages = pgTable("messages", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  conversationId: integer("conversation_id").notNull().references(() => conversations.id, { onDelete: "cascade" }),
  role: varchar("role", { length: 20 }).notNull(),
  content: text("content").notNull(),
  model: varchar("model", { length: 100 }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertConversationSchema = createInsertSchema(conversations, {
  title: z.string().min(1, "Title is required"),
  systemPrompt: z.string().optional(),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertMessageSchema = createInsertSchema(messages, {
  conversationId: z.number(),
  role: z.string().min(1),
  content: z.string().min(1),
  model: z.string().optional(),
}).omit({
  id: true,
  createdAt: true,
});

export type InsertConversation = z.infer<typeof insertConversationSchema>;
export type Conversation = typeof conversations.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Message = typeof messages.$inferSelect;

export const chatRequestSchema = z.object({
  message: z.string().min(1, "Message cannot be empty"),
  model: z.enum(["claude-opus-4-20250514", "claude-sonnet-4-5", "claude-haiku-4-5"]),
  conversationId: z.number().optional(),
  systemPrompt: z.string().optional(),
});

export type ChatRequest = z.infer<typeof chatRequestSchema>;

export const modelOptions = [
  { label: "Claude 4.1 Opus", value: "claude-opus-4-20250514" },
  { label: "Claude 4.5 Sonnet", value: "claude-sonnet-4-5" },
  { label: "Claude 4.5 Haiku", value: "claude-haiku-4-5" },
] as const;

export type ModelValue = typeof modelOptions[number]["value"];
