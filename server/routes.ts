import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertSavedMessageSchema } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // Get all saved messages
  app.get("/api/messages", async (_req, res) => {
    try {
      const messages = await storage.getSavedMessages();
      res.json(messages);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch messages" });
    }
  });

  // Get a specific saved message
  app.get("/api/messages/:id", async (req, res) => {
    try {
      const message = await storage.getSavedMessage(req.params.id);
      if (!message) {
        return res.status(404).json({ error: "Message not found" });
      }
      res.json(message);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch message" });
    }
  });

  // Create a new saved message
  app.post("/api/messages", async (req, res) => {
    try {
      const validatedData = insertSavedMessageSchema.parse(req.body);
      const savedMessage = await storage.createSavedMessage(validatedData);
      res.status(201).json(savedMessage);
    } catch (error) {
      res.status(400).json({ error: "Invalid message data" });
    }
  });

  // Delete a saved message
  app.delete("/api/messages/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteSavedMessage(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Message not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete message" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
