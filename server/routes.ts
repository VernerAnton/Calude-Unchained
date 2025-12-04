import type { Express } from "express";
import { createServer, type Server } from "http";
import { anthropic } from "./anthropic";
import { chatRequestSchema, insertConversationSchema, insertMessageSchema, insertProjectSchema } from "@shared/schema";
import { storage } from "./storage";
import { z } from "zod";
import multer from "multer";
import path from "path";
import fs from "fs/promises";

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
        threadRootId
      } = validatedData;

      if (!conversationId) {
        res.status(400).json({ error: "conversationId is required" });
        return;
      }

      // Save user message to database first with parentMessageId
      const savedUserMessage = await storage.createMessage({
        conversationId,
        parentMessageId: parentMessageId ?? null,
        role: "user",
        content: userMessage,
      });

      // Set headers for SSE streaming
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");

      // Build conversation history for Claude API
      const messages: Array<{ role: "user" | "assistant"; content: string }> = [];
      
      if (threadContext && threadRootId) {
        // Thread mode: only include root message + thread messages
        const allDbMessages = await storage.getMessages(conversationId);
        const rootMsg = allDbMessages.find(m => m.id === threadRootId);
        
        if (rootMsg) {
          // Add root message as context
          messages.push({
            role: rootMsg.role as "user" | "assistant",
            content: rootMsg.content,
          });
          
          // Add all thread messages (those with parentMessageId in the thread chain)
          const threadMsgs = getThreadChain(allDbMessages, threadRootId);
          threadMsgs.forEach((msg) => {
            messages.push({
              role: msg.role as "user" | "assistant",
              content: msg.content,
            });
          });
        }
        
        // Add current message
        messages.push({
          role: "user",
          content: userMessage,
        });
      } else {
        // Main chat mode: build conversation path up to this message
        const allDbMessages = await storage.getMessages(conversationId);
        const conversationPath = buildConversationPath(allDbMessages, savedUserMessage.id);
        
        conversationPath.forEach((msg) => {
          messages.push({
            role: msg.role as "user" | "assistant",
            content: msg.content,
          });
        });
      }

      // Build stream options
      const streamOptions: any = {
        model: model,
        max_tokens: 4096,
        messages: messages,
      };

      // Add system prompt if provided
      if (systemPrompt) {
        streamOptions.system = systemPrompt;
      }

      // Stream response from Claude
      const stream = await anthropic.messages.stream(streamOptions);

      let fullContent = "";

      // Process streaming response
      for await (const chunk of stream) {
        if (chunk.type === "content_block_delta" && chunk.delta.type === "text_delta") {
          fullContent += chunk.delta.text;
          const data = JSON.stringify({ content: chunk.delta.text });
          res.write(`data: ${data}\n\n`);
        }
      }

      // Save assistant response to database with parentMessageId set to the user message
      await storage.createMessage({
        conversationId,
        parentMessageId: savedUserMessage.id,
        role: "assistant",
        content: fullContent,
        model,
      });

      // Send completion signal
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
