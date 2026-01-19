import { db } from "./db";
import { 
  type Conversation, 
  type InsertConversation,
  type Message,
  type InsertMessage,
  type Project,
  type InsertProject,
  type ProjectFile,
  type InsertProjectFile,
  type MessageFile,
  type InsertMessageFile,
  type Settings,
  type InsertSettings,
  conversations, 
  messages,
  projects,
  projectFiles,
  messageFiles,
  settings
} from "@shared/schema";
import { eq, desc, isNull, inArray } from "drizzle-orm";

export interface IStorage {
  // Projects
  getProjects(): Promise<Project[]>;
  getProject(id: number): Promise<Project | undefined>;
  createProject(project: InsertProject): Promise<Project>;
  updateProject(id: number, updates: Partial<InsertProject>): Promise<Project | undefined>;
  deleteProject(id: number): Promise<void>;
  touchProject(id: number): Promise<void>;
  
  // Conversations
  getConversations(): Promise<Conversation[]>;
  getConversation(id: number): Promise<Conversation | undefined>;
  createConversation(conversation: InsertConversation): Promise<Conversation>;
  updateConversation(id: number, updates: Partial<InsertConversation>): Promise<Conversation | undefined>;
  deleteConversation(id: number): Promise<void>;
  
  // Messages
  getMessages(conversationId: number): Promise<Message[]>;
  createMessage(message: InsertMessage): Promise<Message>;
  deleteMessage(id: number): Promise<void>;
  updateMessageThreadDraft(id: number, threadDraft: string | null): Promise<void>;
  
  // Project Files
  getProjectFiles(projectId: number): Promise<ProjectFile[]>;
  getProjectFile(id: number): Promise<ProjectFile | undefined>;
  createProjectFile(file: InsertProjectFile): Promise<ProjectFile>;
  deleteProjectFile(id: number): Promise<void>;
  
  // Message Files
  getMessageFiles(messageId: number): Promise<MessageFile[]>;
  getMessageFilesForMessages(messageIds: number[]): Promise<MessageFile[]>;
  createMessageFile(file: InsertMessageFile): Promise<MessageFile>;
  deleteMessageFile(id: number): Promise<void>;
  
  // Settings
  getSettings(): Promise<Settings>;
  updateSettings(updates: InsertSettings): Promise<Settings>;
  
  // Bulk operations
  deleteAllConversations(): Promise<void>;
}

export class DbStorage implements IStorage {
  // Projects
  async getProjects(): Promise<Project[]> {
    return await db.select().from(projects).orderBy(desc(projects.updatedAt));
  }

  async getProject(id: number): Promise<Project | undefined> {
    const result = await db.select().from(projects).where(eq(projects.id, id)).limit(1);
    return result[0];
  }

  async createProject(project: InsertProject): Promise<Project> {
    const result = await db.insert(projects).values(project).returning();
    return result[0];
  }

  async updateProject(id: number, updates: Partial<InsertProject>): Promise<Project | undefined> {
    const result = await db
      .update(projects)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(projects.id, id))
      .returning();
    return result[0];
  }

  async deleteProject(id: number): Promise<void> {
    await db.delete(projects).where(eq(projects.id, id));
  }

  async touchProject(id: number): Promise<void> {
    await db
      .update(projects)
      .set({ updatedAt: new Date() })
      .where(eq(projects.id, id));
  }

  // Conversations
  async getConversations(): Promise<Conversation[]> {
    return await db.select().from(conversations).orderBy(desc(conversations.updatedAt));
  }

  async getConversation(id: number): Promise<Conversation | undefined> {
    const result = await db.select().from(conversations).where(eq(conversations.id, id)).limit(1);
    return result[0];
  }

  async createConversation(conversation: InsertConversation): Promise<Conversation> {
    const result = await db.insert(conversations).values(conversation).returning();
    
    if (result[0] && result[0].projectId) {
      await this.touchProject(result[0].projectId);
    }
    
    return result[0];
  }

  async updateConversation(id: number, updates: Partial<InsertConversation>): Promise<Conversation | undefined> {
    const oldConv = await this.getConversation(id);
    
    const result = await db
      .update(conversations)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(conversations.id, id))
      .returning();
    
    if (oldConv?.projectId && oldConv.projectId !== result[0]?.projectId) {
      await this.touchProject(oldConv.projectId);
    }
    
    if (result[0] && result[0].projectId) {
      await this.touchProject(result[0].projectId);
    }
    
    return result[0];
  }

  async deleteConversation(id: number): Promise<void> {
    await db.delete(conversations).where(eq(conversations.id, id));
  }

  // Messages
  async getMessages(conversationId: number): Promise<Message[]> {
    return await db.select().from(messages).where(eq(messages.conversationId, conversationId)).orderBy(messages.createdAt);
  }

  async createMessage(message: InsertMessage): Promise<Message> {
    const result = await db.insert(messages).values(message).returning();
    
    const conversation = await this.getConversation(message.conversationId);
    if (conversation?.projectId) {
      await this.touchProject(conversation.projectId);
    }
    
    return result[0];
  }

  async deleteMessage(id: number): Promise<void> {
    await db.delete(messages).where(eq(messages.id, id));
  }

  async updateMessageThreadDraft(id: number, threadDraft: string | null): Promise<void> {
    await db.update(messages).set({ threadDraft }).where(eq(messages.id, id));
  }

  // Project Files
  async getProjectFiles(projectId: number): Promise<ProjectFile[]> {
    return await db.select().from(projectFiles).where(eq(projectFiles.projectId, projectId)).orderBy(projectFiles.createdAt);
  }

  async getProjectFile(id: number): Promise<ProjectFile | undefined> {
    const result = await db.select().from(projectFiles).where(eq(projectFiles.id, id)).limit(1);
    return result[0];
  }

  async createProjectFile(file: InsertProjectFile): Promise<ProjectFile> {
    const result = await db.insert(projectFiles).values(file).returning();
    return result[0];
  }

  async deleteProjectFile(id: number): Promise<void> {
    await db.delete(projectFiles).where(eq(projectFiles.id, id));
  }

  // Message Files
  async getMessageFiles(messageId: number): Promise<MessageFile[]> {
    return await db.select().from(messageFiles).where(eq(messageFiles.messageId, messageId)).orderBy(messageFiles.createdAt);
  }

  async getMessageFilesForMessages(messageIds: number[]): Promise<MessageFile[]> {
    if (messageIds.length === 0) return [];
    return await db.select().from(messageFiles).where(inArray(messageFiles.messageId, messageIds)).orderBy(messageFiles.createdAt);
  }

  async createMessageFile(file: InsertMessageFile): Promise<MessageFile> {
    const result = await db.insert(messageFiles).values(file).returning();
    return result[0];
  }

  async deleteMessageFile(id: number): Promise<void> {
    await db.delete(messageFiles).where(eq(messageFiles.id, id));
  }

  // Settings
  async getSettings(): Promise<Settings> {
    const result = await db.select().from(settings).limit(1);
    if (result[0]) {
      return result[0];
    }
    const newSettings = await db.insert(settings).values({}).returning();
    return newSettings[0];
  }

  async updateSettings(updates: InsertSettings): Promise<Settings> {
    const existing = await this.getSettings();
    const result = await db
      .update(settings)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(settings.id, existing.id))
      .returning();
    return result[0];
  }

  // Bulk operations
  async deleteAllConversations(): Promise<void> {
    await db.delete(conversations);
  }
}

export const storage = new DbStorage();
