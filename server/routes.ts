import type { Express } from "express";
import { createServer, type Server } from "http";
import { anthropic } from "./anthropic";
import { chatRequestSchema, insertConversationSchema, insertMessageSchema, insertProjectSchema, insertSettingsSchema, type FileAttachment } from "@shared/schema";
import { storage } from "./storage";
import { z } from "zod";
import multer from "multer";
import path from "path";
import fs from "fs/promises";
import type Anthropic from "@anthropic-ai/sdk";

const IMAGE_MIME_TYPES = ["image/png", "image/jpeg", "image/gif", "image/webp"];
const PDF_MIME_TYPE = "application/pdf";

function isImageFile(mimeType: string): boolean {
  return IMAGE_MIME_TYPES.includes(mimeType);
}

function isPdfFile(mimeType: string): boolean {
  return mimeType === PDF_MIME_TYPE;
}

function isTextFile(mimeType: string): boolean {
  const textMimeTypes = [
    "text/plain",
    "text/html",
    "text/css",
    "text/javascript",
    "text/markdown",
    "text/csv",
    "text/xml",
    "application/json",
    "application/xml",
    "application/javascript",
    "application/typescript",
    "application/x-yaml",
    "application/x-sh",
  ];
  return textMimeTypes.includes(mimeType) || mimeType.startsWith("text/");
}

const upload = multer({ 
  dest: "uploads/",
  limits: { fileSize: 10 * 1024 * 1024 }
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Projects
  app.get("/api/projects", async (_req, res) => {
    try {
      const projects = await storage.getProjects();
      res.json(projects);
    } catch (error) {
      console.error("Error fetching projects:", error);
      res.status(500).json({ error: "Failed to fetch projects" });
    }
  });

  app.get("/api/projects/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const project = await storage.getProject(id);
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }
      res.json(project);
    } catch (error) {
      console.error("Error fetching project:", error);
      res.status(500).json({ error: "Failed to fetch project" });
    }
  });

  app.post("/api/projects", async (req, res) => {
    try {
      const validatedData = insertProjectSchema.parse(req.body);
      const project = await storage.createProject(validatedData);
      res.json(project);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid request data", details: error.errors });
      }
      console.error("Error creating project:", error);
      res.status(500).json({ error: "Failed to create project" });
    }
  });

  app.patch("/api/projects/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updates = insertProjectSchema.partial().parse(req.body);
      const project = await storage.updateProject(id, updates);
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }
      res.json(project);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid request data", details: error.errors });
      }
      console.error("Error updating project:", error);
      res.status(500).json({ error: "Failed to update project" });
    }
  });

  app.delete("/api/projects/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteProject(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting project:", error);
      res.status(500).json({ error: "Failed to delete project" });
    }
  });

  // Get all conversations
  app.get("/api/conversations", async (_req, res) => {
    try {
      const conversations = await storage.getConversations();
      res.json(conversations);
    } catch (error) {
      console.error("Error fetching conversations:", error);
      res.status(500).json({ error: "Failed to fetch conversations" });
    }
  });

  // Get single conversation
  app.get("/api/conversations/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const conversation = await storage.getConversation(id);
      if (!conversation) {
        return res.status(404).json({ error: "Conversation not found" });
      }
      res.json(conversation);
    } catch (error) {
      console.error("Error fetching conversation:", error);
      res.status(500).json({ error: "Failed to fetch conversation" });
    }
  });

  // Create conversation
  app.post("/api/conversations", async (req, res) => {
    try {
      const validatedData = insertConversationSchema.parse(req.body);
      const conversation = await storage.createConversation(validatedData);
      res.json(conversation);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid request data", details: error.errors });
      }
      console.error("Error creating conversation:", error);
      res.status(500).json({ error: "Failed to create conversation" });
    }
  });

  // Update conversation
  app.patch("/api/conversations/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updates = insertConversationSchema.partial().parse(req.body);
      const conversation = await storage.updateConversation(id, updates);
      if (!conversation) {
        return res.status(404).json({ error: "Conversation not found" });
      }
      res.json(conversation);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid request data", details: error.errors });
      }
      console.error("Error updating conversation:", error);
      res.status(500).json({ error: "Failed to update conversation" });
    }
  });

  // Delete conversation
  app.delete("/api/conversations/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteConversation(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting conversation:", error);
      res.status(500).json({ error: "Failed to delete conversation" });
    }
  });

  // Get messages for a conversation
  app.get("/api/conversations/:id/messages", async (req, res) => {
    try {
      const conversationId = parseInt(req.params.id);
      const messages = await storage.getMessages(conversationId);
      res.json(messages);
    } catch (error) {
      console.error("Error fetching messages:", error);
      res.status(500).json({ error: "Failed to fetch messages" });
    }
  });

  // Create message
  app.post("/api/messages", async (req, res) => {
    try {
      const validatedData = insertMessageSchema.parse(req.body);
      const message = await storage.createMessage(validatedData);
      res.json(message);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid request data", details: error.errors });
      }
      console.error("Error creating message:", error);
      res.status(500).json({ error: "Failed to create message" });
    }
  });

  // Delete message
  app.delete("/api/messages/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteMessage(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting message:", error);
      res.status(500).json({ error: "Failed to delete message" });
    }
  });

  // Update message thread draft
  app.patch("/api/messages/:id/thread-draft", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { threadDraft } = req.body;
      await storage.updateMessageThreadDraft(id, threadDraft);
      res.json({ success: true });
    } catch (error) {
      console.error("Error updating thread draft:", error);
      res.status(500).json({ error: "Failed to update thread draft" });
    }
  });

  // Project Files
  app.get("/api/projects/:id/files", async (req, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const files = await storage.getProjectFiles(projectId);
      res.json(files);
    } catch (error) {
      console.error("Error fetching project files:", error);
      res.status(500).json({ error: "Failed to fetch project files" });
    }
  });

  app.post("/api/projects/:id/files", upload.single("file"), async (req, res) => {
    try {
      const projectId = parseInt(req.params.id);
      
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const fileRecord = await storage.createProjectFile({
        projectId,
        filename: req.file.filename,
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
        size: req.file.size,
      });

      res.json(fileRecord);
    } catch (error) {
      console.error("Error uploading file:", error);
      res.status(500).json({ error: "Failed to upload file" });
    }
  });

  app.get("/api/files/:filename", async (req, res) => {
    try {
      const filename = req.params.filename;
      const filePath = path.join(process.cwd(), "uploads", filename);
      
      await fs.access(filePath);
      res.sendFile(filePath);
    } catch (error) {
      console.error("Error serving file:", error);
      res.status(404).json({ error: "File not found" });
    }
  });

  app.delete("/api/files/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      const file = await storage.getProjectFile(id);
      
      if (file) {
        const filePath = path.join(process.cwd(), "uploads", file.filename);
        try {
          await fs.unlink(filePath);
        } catch (unlinkError) {
          console.error("Error deleting file from disk:", unlinkError);
        }
      }
      
      await storage.deleteProjectFile(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting file:", error);
      res.status(500).json({ error: "Failed to delete file" });
    }
  });

  // Get message files for a conversation
  app.get("/api/conversations/:id/files", async (req, res) => {
    try {
      const conversationId = parseInt(req.params.id);
      const messages = await storage.getMessages(conversationId);
      const messageIds = messages.map(m => m.id);
      const files = await storage.getMessageFilesForMessages(messageIds);
      res.json(files);
    } catch (error) {
      console.error("Error fetching message files:", error);
      res.status(500).json({ error: "Failed to fetch message files" });
    }
  });

  // Settings
  app.get("/api/settings", async (_req, res) => {
    try {
      const settings = await storage.getSettings();
      res.json(settings);
    } catch (error) {
      console.error("Error fetching settings:", error);
      res.status(500).json({ error: "Failed to fetch settings" });
    }
  });

  app.patch("/api/settings", async (req, res) => {
    try {
      const validatedData = insertSettingsSchema.parse(req.body);
      const settings = await storage.updateSettings(validatedData);
      res.json(settings);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid request data", details: error.errors });
      }
      console.error("Error updating settings:", error);
      res.status(500).json({ error: "Failed to update settings" });
    }
  });

  // Delete all conversations
  app.delete("/api/conversations", async (_req, res) => {
    try {
      await storage.deleteAllConversations();
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting all conversations:", error);
      res.status(500).json({ error: "Failed to delete all conversations" });
    }
  });

  // Streaming chat endpoint
  app.post("/api/chat", async (req, res) => {
    try {
      // Validate request body
      const validatedData = chatRequestSchema.parse(req.body);
      const { 
        message: userMessage, 
        model, 
        conversationId, 
        systemPrompt,
        parentMessageId,
        threadContext,
        threadRootId,
        files
      } = validatedData;

      if (!conversationId) {
        res.status(400).json({ error: "conversationId is required" });
        return;
      }

      // Save user message to database first with parentMessageId
      // Mark as thread message if in thread context
      const savedUserMessage = await storage.createMessage({
        conversationId,
        parentMessageId: parentMessageId ?? null,
        role: "user",
        content: userMessage,
        isThreadMessage: threadContext ?? false,
      });

      // Save file attachments if present
      if (files && files.length > 0) {
        for (const file of files) {
          const isImage = isImageFile(file.mimeType);
          const isPdf = isPdfFile(file.mimeType);
          const isText = isTextFile(file.mimeType);
          
          await storage.createMessageFile({
            messageId: savedUserMessage.id,
            filename: file.filename,
            originalName: file.originalName,
            mimeType: file.mimeType,
            size: file.size,
            fileData: (isImage || isPdf) ? file.data : undefined,
            textContent: isText ? Buffer.from(file.data, 'base64').toString('utf-8') : undefined,
          });
        }
      }

      // Set headers for SSE streaming
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
      res.setHeader("X-Accel-Buffering", "no"); // Disable nginx buffering
      res.flushHeaders(); // Send headers immediately to start stream
      
      // Disable Nagle's algorithm for immediate packet delivery
      if (res.socket) {
        res.socket.setNoDelay(true);
      }

      // Build conversation history for Claude API
      type ContentBlock = Anthropic.TextBlockParam | Anthropic.ImageBlockParam | Anthropic.DocumentBlockParam;
      type MessageContent = string | ContentBlock[];
      const claudeMessages: Array<{ role: "user" | "assistant"; content: MessageContent }> = [];
      
      if (threadContext && threadRootId) {
        // Thread mode: only include root message + thread messages
        const allDbMessages = await storage.getMessages(conversationId);
        const rootMsg = allDbMessages.find(m => m.id === threadRootId);
        
        if (rootMsg) {
          // Add root message as context
          claudeMessages.push({
            role: rootMsg.role as "user" | "assistant",
            content: rootMsg.content,
          });
          
          // Add all thread messages (those with parentMessageId in the thread chain)
          const threadMsgs = getThreadChain(allDbMessages, threadRootId);
          threadMsgs.forEach((msg) => {
            claudeMessages.push({
              role: msg.role as "user" | "assistant",
              content: msg.content,
            });
          });
        }
        
        // Add current message with files if present
        claudeMessages.push({
          role: "user",
          content: buildUserContent(userMessage, files),
        });
      } else {
        // Main chat mode: build conversation path up to this message
        const allDbMessages = await storage.getMessages(conversationId);
        const conversationPath = buildConversationPath(allDbMessages, savedUserMessage.id);
        
        // Get all file attachments for messages in this path
        const pathMessageIds = conversationPath.map(m => m.id);
        const allMessageFiles = await storage.getMessageFilesForMessages(pathMessageIds);
        const filesByMessageId = new Map<number, typeof allMessageFiles>();
        for (const file of allMessageFiles) {
          if (!filesByMessageId.has(file.messageId)) {
            filesByMessageId.set(file.messageId, []);
          }
          filesByMessageId.get(file.messageId)!.push(file);
        }
        
        for (const msg of conversationPath) {
          const msgFiles = filesByMessageId.get(msg.id);
          if (msg.id === savedUserMessage.id) {
            // Current message - use the files from the request
            claudeMessages.push({
              role: "user",
              content: buildUserContent(userMessage, files),
            });
          } else if (msg.role === "user" && msgFiles && msgFiles.length > 0) {
            // Historical user message with files
            const reconstructedFiles: FileAttachment[] = msgFiles.map(f => ({
              filename: f.filename,
              originalName: f.originalName,
              mimeType: f.mimeType,
              size: f.size,
              data: f.fileData || (f.textContent ? Buffer.from(f.textContent).toString('base64') : ''),
            }));
            claudeMessages.push({
              role: "user",
              content: buildUserContent(msg.content, reconstructedFiles),
            });
          } else {
            claudeMessages.push({
              role: msg.role as "user" | "assistant",
              content: msg.content,
            });
          }
        }
      }

      // Build stream options
      const streamOptions: any = {
        model: model,
        max_tokens: 4096,
        messages: claudeMessages,
      };

      // Add system prompt if provided
      if (systemPrompt) {
        streamOptions.system = systemPrompt;
      }

      // Stream response from Claude using event-based streaming for granular updates
      let fullContent = "";

      const stream = anthropic.messages.stream(streamOptions);
      
      // Use event-based streaming for immediate token delivery
      stream.on('text', (text: string) => {
        fullContent += text;
        const data = JSON.stringify({ content: text });
        res.write(`data: ${data}\n\n`);
      });
      
      // Handle stream errors gracefully
      stream.on('error', (error: Error) => {
        console.error("Stream error:", error);
        res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
        res.write(`data: [DONE]\n\n`);
        res.end();
      });

      // Wait for stream to complete
      await stream.finalMessage();

      // Save assistant response to database with parentMessageId set to the user message
      // Mark as thread message if in thread context
      await storage.createMessage({
        conversationId,
        parentMessageId: savedUserMessage.id,
        role: "assistant",
        content: fullContent,
        model,
        isThreadMessage: threadContext ?? false,
      });

      // Send completion signal and close stream
      res.write(`data: [DONE]\n\n`);
      res.end();
    } catch (error) {
      console.error("Error in chat endpoint:", error);
      
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Invalid request data", details: error.errors });
      } else if (error instanceof Error) {
        res.status(500).json({ error: error.message });
      } else {
        res.status(500).json({ error: "An unknown error occurred" });
      }
    }
  });

  // Helper function to build user content with files for Claude API
  function buildUserContent(
    text: string,
    files?: FileAttachment[]
  ): string | Array<Anthropic.TextBlockParam | Anthropic.ImageBlockParam | Anthropic.DocumentBlockParam> {
    if (!files || files.length === 0) {
      return text;
    }

    const contentBlocks: Array<Anthropic.TextBlockParam | Anthropic.ImageBlockParam | Anthropic.DocumentBlockParam> = [];

    // Add files first
    for (const file of files) {
      if (isImageFile(file.mimeType)) {
        contentBlocks.push({
          type: "image",
          source: {
            type: "base64",
            media_type: file.mimeType as "image/png" | "image/jpeg" | "image/gif" | "image/webp",
            data: file.data,
          },
        });
      } else if (isPdfFile(file.mimeType)) {
        contentBlocks.push({
          type: "document",
          source: {
            type: "base64",
            media_type: "application/pdf",
            data: file.data,
          },
        });
      } else if (isTextFile(file.mimeType)) {
        // For text files, decode and include as text
        const textContent = Buffer.from(file.data, 'base64').toString('utf-8');
        contentBlocks.push({
          type: "text",
          text: `[File: ${file.originalName}]\n\`\`\`\n${textContent}\n\`\`\``,
        });
      }
    }

    // Add user text message
    contentBlocks.push({
      type: "text",
      text: text,
    });

    return contentBlocks;
  }

  // Helper function to get thread chain messages
  function getThreadChain(messages: any[], rootId: number): any[] {
    const result: any[] = [];
    const childMap = new Map<number, any[]>();
    
    for (const msg of messages) {
      const parentId = msg.parentMessageId;
      if (parentId !== null && parentId !== undefined) {
        if (!childMap.has(parentId)) {
          childMap.set(parentId, []);
        }
        childMap.get(parentId)!.push(msg);
      }
    }
    
    // Traverse from root, taking first child at each level
    let currentId = rootId;
    while (childMap.has(currentId)) {
      const children = childMap.get(currentId)!;
      children.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      const firstChild = children[0];
      result.push(firstChild);
      currentId = firstChild.id;
    }
    
    return result;
  }

  // Helper function to build conversation path up to a specific message
  function buildConversationPath(messages: any[], targetMessageId: number): any[] {
    const messageMap = new Map<number, any>();
    for (const msg of messages) {
      messageMap.set(msg.id, msg);
    }
    
    // Walk backwards from target to root
    const path: any[] = [];
    let currentMsg = messageMap.get(targetMessageId);
    
    while (currentMsg) {
      path.unshift(currentMsg);
      if (currentMsg.parentMessageId === null || currentMsg.parentMessageId === undefined) {
        break;
      }
      currentMsg = messageMap.get(currentMsg.parentMessageId);
    }
    
    return path;
  }

  const httpServer = createServer(app);

  return httpServer;
}
