import type { Express } from "express";
import { createServer, type Server } from "http";
import { anthropic } from "./anthropic";
import { chatRequestSchema, type Message } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Streaming chat endpoint
  app.post("/api/chat", async (req, res) => {
    try {
      // Validate request body
      const validatedData = chatRequestSchema.parse(req.body);
      const { message, model, conversationHistory = [] } = validatedData;

      // Set headers for SSE streaming
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");

      // Build conversation history for Claude API
      const messages: Array<{ role: "user" | "assistant"; content: string }> = [];
      
      // Add conversation history
      conversationHistory.forEach((msg: Message) => {
        messages.push({
          role: msg.role,
          content: msg.content,
        });
      });

      // Add current user message
      messages.push({
        role: "user",
        content: message,
      });

      // Stream response from Claude
      const stream = await anthropic.messages.stream({
        model: model,
        max_tokens: 4096,
        messages: messages,
      });

      // Process streaming response
      for await (const chunk of stream) {
        if (chunk.type === "content_block_delta" && chunk.delta.type === "text_delta") {
          const data = JSON.stringify({ content: chunk.delta.text });
          res.write(`data: ${data}\n\n`);
        }
      }

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

  const httpServer = createServer(app);

  return httpServer;
}
