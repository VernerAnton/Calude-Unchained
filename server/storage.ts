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
  type ApiUsage,
  type InsertApiUsage,
  type Ledger,
  type InsertLedger,
  type LedgerVersion,
  conversations, 
  messages,
  projects,
  projectFiles,
  messageFiles,
  settings,
  apiUsage,
  ledgers,
  ledgerVersions,
} from "@shared/schema";
import { eq, desc, isNull, inArray, gte, and, sql, max } from "drizzle-orm";

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
  
  // API Usage
  recordApiUsage(usage: InsertApiUsage): Promise<ApiUsage>;
  getUsageToday(): Promise<number>;
  getUsageThisMonth(): Promise<number>;
  getUsageLast7Days(): Promise<number>;
  getDailyUsage(days: number): Promise<{ date: string; cost: number }[]>;
  getUsageByModel(startDate: Date): Promise<{ model: string; cost: number }[]>;
  getActiveDaysUsage(numDays: number): Promise<number[]>;
  
  // Ledgers
  getLedgers(): Promise<Ledger[]>;
  getLedger(id: number): Promise<Ledger | undefined>;
  createLedger(ledger: InsertLedger, initialContent: string): Promise<{ ledger: Ledger; version: LedgerVersion }>;
  addLedgerVersion(ledgerId: number, content: string, messageId?: number | null): Promise<LedgerVersion>;
  getLedgerVersions(ledgerId: number): Promise<LedgerVersion[]>;
  getLatestLedgerVersion(ledgerId: number): Promise<LedgerVersion | undefined>;

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
    await db.insert(projects).values(project);
    const [newProject] = await db.select().from(projects).orderBy(desc(projects.id)).limit(1);
    if (!newProject) throw new Error("Failed to retrieve created project");
    return newProject;
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
    await db.insert(conversations).values(conversation);
    const [newConv] = await db.select().from(conversations).orderBy(desc(conversations.id)).limit(1);
    if (!newConv) throw new Error("Failed to retrieve created conversation");
    
    if (newConv.projectId) {
      await this.touchProject(newConv.projectId);
    }
    
    return newConv;
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
    // Neon HTTP driver bug: null integers serialize as "" causing DB errors.
    // Omit parentMessageId entirely when null so PostgreSQL uses its default (NULL).
    const values: Record<string, unknown> = { ...message };
    if (values.parentMessageId == null) {
      delete values.parentMessageId;
    }
    await db.insert(messages).values(values as typeof message);
    const [newMessage] = await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, message.conversationId))
      .orderBy(desc(messages.id))
      .limit(1);
    if (!newMessage) throw new Error("Failed to retrieve created message");
    
    const conversation = await this.getConversation(message.conversationId);
    if (conversation?.projectId) {
      await this.touchProject(conversation.projectId);
    }
    
    return newMessage;
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
    try {
      return await db.select().from(messageFiles).where(inArray(messageFiles.messageId, messageIds)).orderBy(messageFiles.createdAt);
    } catch {
      return [];
    }
  }

  async createMessageFile(file: InsertMessageFile): Promise<MessageFile> {
    await db.insert(messageFiles).values(file);
    const [newFile] = await db.select().from(messageFiles).where(eq(messageFiles.messageId, file.messageId)).orderBy(desc(messageFiles.id)).limit(1);
    if (!newFile) throw new Error("Failed to retrieve created message file");
    return newFile;
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

  // API Usage
  async recordApiUsage(usage: InsertApiUsage): Promise<ApiUsage> {
    const result = await db.insert(apiUsage).values(usage).returning();
    return result[0];
  }

  async getUsageToday(): Promise<number> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const result = await db
      .select({ total: sql<number>`COALESCE(SUM(${apiUsage.costUsd}), 0)` })
      .from(apiUsage)
      .where(gte(apiUsage.createdAt, today));
    return Number(result[0]?.total) || 0;
  }

  async getUsageThisMonth(): Promise<number> {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const result = await db
      .select({ total: sql<number>`COALESCE(SUM(${apiUsage.costUsd}), 0)` })
      .from(apiUsage)
      .where(gte(apiUsage.createdAt, startOfMonth));
    return Number(result[0]?.total) || 0;
  }

  async getUsageLast7Days(): Promise<number> {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const result = await db
      .select({ total: sql<number>`COALESCE(SUM(${apiUsage.costUsd}), 0)` })
      .from(apiUsage)
      .where(gte(apiUsage.createdAt, sevenDaysAgo));
    return Number(result[0]?.total) || 0;
  }

  async getDailyUsage(days: number): Promise<{ date: string; cost: number }[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);
    
    const result = await db
      .select({
        date: sql<string>`DATE(${apiUsage.createdAt})`,
        cost: sql<number>`COALESCE(SUM(${apiUsage.costUsd}), 0)`
      })
      .from(apiUsage)
      .where(gte(apiUsage.createdAt, startDate))
      .groupBy(sql`DATE(${apiUsage.createdAt})`)
      .orderBy(sql`DATE(${apiUsage.createdAt})`);
    
    return result.map(r => ({ date: String(r.date), cost: Number(r.cost) }));
  }

  async getUsageByModel(startDate: Date): Promise<{ model: string; cost: number }[]> {
    const result = await db
      .select({
        model: apiUsage.model,
        cost: sql<number>`COALESCE(SUM(${apiUsage.costUsd}), 0)`
      })
      .from(apiUsage)
      .where(gte(apiUsage.createdAt, startDate))
      .groupBy(apiUsage.model);
    
    return result.map(r => ({ model: r.model, cost: Number(r.cost) }));
  }

  async getActiveDaysUsage(numDays: number): Promise<number[]> {
    const result = await db
      .select({
        date: sql<string>`DATE(${apiUsage.createdAt})`,
        cost: sql<number>`COALESCE(SUM(${apiUsage.costUsd}), 0)`
      })
      .from(apiUsage)
      .groupBy(sql`DATE(${apiUsage.createdAt})`)
      .orderBy(desc(sql`DATE(${apiUsage.createdAt})`))
      .limit(numDays);
    
    return result.map(r => Number(r.cost));
  }

  // Ledgers
  async getLedgers(): Promise<Ledger[]> {
    return await db.select().from(ledgers).orderBy(desc(ledgers.updatedAt));
  }

  async getLedger(id: number): Promise<Ledger | undefined> {
    try {
      const result = await db.select().from(ledgers).where(eq(ledgers.id, id)).limit(1);
      return result[0];
    } catch {
      return undefined;
    }
  }

  async createLedger(ledger: InsertLedger, initialContent: string): Promise<{ ledger: Ledger; version: LedgerVersion }> {
    await db.insert(ledgers).values({
      title: ledger.title,
      type: ledger.type,
      metadataJson: (ledger.metadataJson ?? {}) as Record<string, unknown>,
    });
    const [newLedger] = await db.select().from(ledgers).orderBy(desc(ledgers.id)).limit(1);
    if (!newLedger) throw new Error("Failed to retrieve created ledger");

    await db.insert(ledgerVersions).values({
      ledgerId: newLedger.id,
      versionNumber: 1,
      content: initialContent,
    });
    const [version] = await db.select().from(ledgerVersions)
      .where(eq(ledgerVersions.ledgerId, newLedger.id))
      .orderBy(desc(ledgerVersions.id))
      .limit(1);

    return { ledger: newLedger, version };
  }

  async addLedgerVersion(ledgerId: number, content: string, messageId?: number | null): Promise<LedgerVersion> {
    const maxResult = await db
      .select({ maxVersion: max(ledgerVersions.versionNumber) })
      .from(ledgerVersions)
      .where(eq(ledgerVersions.ledgerId, ledgerId));
    const nextVersion = (maxResult[0]?.maxVersion ?? 0) + 1;

    const versionValues: typeof ledgerVersions.$inferInsert = {
      ledgerId,
      versionNumber: nextVersion,
      content,
    };
    if (messageId != null) {
      versionValues.createdFromMessageId = messageId;
    }
    await db.insert(ledgerVersions).values(versionValues);

    const [version] = await db.select().from(ledgerVersions)
      .where(eq(ledgerVersions.ledgerId, ledgerId))
      .orderBy(desc(ledgerVersions.id))
      .limit(1);

    await db.update(ledgers).set({ updatedAt: new Date() }).where(eq(ledgers.id, ledgerId));

    return version;
  }

  async getLedgerVersions(ledgerId: number): Promise<LedgerVersion[]> {
    try {
      return await db
        .select()
        .from(ledgerVersions)
        .where(eq(ledgerVersions.ledgerId, ledgerId))
        .orderBy(desc(ledgerVersions.versionNumber));
    } catch {
      return [];
    }
  }

  async getLatestLedgerVersion(ledgerId: number): Promise<LedgerVersion | undefined> {
    try {
      const result = await db
        .select()
        .from(ledgerVersions)
        .where(eq(ledgerVersions.ledgerId, ledgerId))
        .orderBy(desc(ledgerVersions.id))
        .limit(1);
      return result[0];
    } catch {
      return undefined;
    }
  }

  // Bulk operations
  async deleteAllConversations(): Promise<void> {
    await db.delete(conversations);
  }
}

export const storage = new DbStorage();
