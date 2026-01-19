import { pgTable, text, varchar, timestamp, integer, boolean, AnyPgColumn } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const projects = pgTable("projects", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: varchar("name", { length: 255 }).notNull(),
  instructions: text("instructions"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const conversations = pgTable("conversations", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  title: varchar("title", { length: 255 }).notNull(),
  systemPrompt: text("system_prompt"),
  projectId: integer("project_id").references(() => projects.id, { onDelete: "set null" }),
  draft: text("draft"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const messages = pgTable("messages", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  conversationId: integer("conversation_id").notNull().references(() => conversations.id, { onDelete: "cascade" }),
  parentMessageId: integer("parent_message_id").references((): AnyPgColumn => messages.id, { onDelete: "cascade" }),
  role: varchar("role", { length: 20 }).notNull(),
  content: text("content").notNull(),
  model: varchar("model", { length: 100 }),
  isThreadMessage: boolean("is_thread_message").notNull().default(false),
  threadDraft: text("thread_draft"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const projectFiles = pgTable("project_files", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  projectId: integer("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  filename: varchar("filename", { length: 255 }).notNull(),
  originalName: varchar("original_name", { length: 255 }).notNull(),
  mimeType: varchar("mime_type", { length: 100 }).notNull(),
  size: integer("size").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const messageFiles = pgTable("message_files", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  messageId: integer("message_id").notNull().references(() => messages.id, { onDelete: "cascade" }),
  filename: varchar("filename", { length: 255 }).notNull(),
  originalName: varchar("original_name", { length: 255 }).notNull(),
  mimeType: varchar("mime_type", { length: 100 }).notNull(),
  size: integer("size").notNull(),
  fileData: text("file_data"),
  textContent: text("text_content"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertProjectSchema = z.object({
  name: z.string().min(1, "Project name is required"),
  instructions: z.string().optional(),
});

export const insertConversationSchema = z.object({
  title: z.string().min(1, "Title is required"),
  systemPrompt: z.string().optional(),
  projectId: z.number().optional(),
  draft: z.string().nullable().optional(),
});

export const insertMessageSchema = z.object({
  conversationId: z.number(),
  parentMessageId: z.number().nullable().optional(),
  role: z.string().min(1),
  content: z.string().min(1),
  model: z.string().optional(),
  isThreadMessage: z.boolean().optional(),
  threadDraft: z.string().nullable().optional(),
});

export const insertProjectFileSchema = z.object({
  projectId: z.number(),
  filename: z.string().min(1),
  originalName: z.string().min(1),
  mimeType: z.string().min(1),
  size: z.number(),
});

export const insertMessageFileSchema = z.object({
  messageId: z.number(),
  filename: z.string().min(1),
  originalName: z.string().min(1),
  mimeType: z.string().min(1),
  size: z.number(),
  fileData: z.string().optional(),
  textContent: z.string().optional(),
});

export type InsertProject = z.infer<typeof insertProjectSchema>;
export type Project = typeof projects.$inferSelect;
export type InsertConversation = z.infer<typeof insertConversationSchema>;
export type Conversation = typeof conversations.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Message = typeof messages.$inferSelect;
export type InsertProjectFile = z.infer<typeof insertProjectFileSchema>;
export type ProjectFile = typeof projectFiles.$inferSelect;
export type InsertMessageFile = z.infer<typeof insertMessageFileSchema>;
export type MessageFile = typeof messageFiles.$inferSelect;

export const fileAttachmentSchema = z.object({
  filename: z.string(),
  originalName: z.string(),
  mimeType: z.string(),
  size: z.number(),
  data: z.string(),
});

export type FileAttachment = z.infer<typeof fileAttachmentSchema>;

export const chatRequestSchema = z.object({
  message: z.string().min(1, "Message cannot be empty"),
  model: z.enum(["claude-opus-4-20250514", "claude-sonnet-4-5", "claude-haiku-4-5"]),
  conversationId: z.number().optional(),
  systemPrompt: z.string().optional(),
  parentMessageId: z.number().nullable().optional(),
  threadContext: z.boolean().optional(),
  threadRootId: z.number().optional(),
  files: z.array(fileAttachmentSchema).optional(),
});

export type ChatRequest = z.infer<typeof chatRequestSchema>;

export const modelOptions = [
  { label: "Claude 4.1 Opus", value: "claude-opus-4-20250514" },
  { label: "Claude 4.5 Sonnet", value: "claude-sonnet-4-5" },
  { label: "Claude 4.5 Haiku", value: "claude-haiku-4-5" },
] as const;

export type ModelValue = typeof modelOptions[number]["value"];

export const settings = pgTable("settings", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  defaultModel: varchar("default_model", { length: 100 }).notNull().default("claude-sonnet-4-5"),
  theme: varchar("theme", { length: 20 }).notNull().default("system"),
  autoTitle: boolean("auto_title").notNull().default(true),
  fontSize: varchar("font_size", { length: 20 }).notNull().default("medium"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertSettingsSchema = z.object({
  defaultModel: z.enum(["claude-opus-4-20250514", "claude-sonnet-4-5", "claude-haiku-4-5"]).optional(),
  theme: z.enum(["system", "light", "dark"]).optional(),
  autoTitle: z.boolean().optional(),
  fontSize: z.enum(["small", "medium", "large"]).optional(),
});

export type InsertSettings = z.infer<typeof insertSettingsSchema>;
export type Settings = typeof settings.$inferSelect;
