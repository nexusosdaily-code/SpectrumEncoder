import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertSavedMessageSchema, insertUserSchema } from "@shared/schema";
import { z } from "zod";
import "./types"; // Import session type declarations

// Mobile number validation schema
const mobileNumberSchema = z.string().regex(/^\+?[1-9]\d{1,14}$/, "Invalid mobile number format");

export async function registerRoutes(app: Express): Promise<Server> {
  // Authentication routes
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { mobileNumber } = req.body;
      const validated = mobileNumberSchema.parse(mobileNumber);
      
      // Check if user exists
      let user = await storage.getUserByMobileNumber(validated);
      
      // Create new user if doesn't exist
      if (!user) {
        user = await storage.createUser({ mobileNumber: validated });
      }
      
      // Set session
      req.session.userId = user.id;
      req.session.mobileNumber = user.mobileNumber;
      
      res.json({ user: { id: user.id, mobileNumber: user.mobileNumber } });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid mobile number format" });
      }
      res.status(500).json({ error: "Login failed" });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err: Error | null) => {
      if (err) {
        return res.status(500).json({ error: "Logout failed" });
      }
      res.json({ message: "Logged out successfully" });
    });
  });

  app.get("/api/auth/me", (req, res) => {
    if (!req.session || !req.session.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    res.json({
      user: {
        id: req.session.userId,
        mobileNumber: req.session.mobileNumber
      }
    });
  });

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

  // Update a saved message
  app.patch("/api/messages/:id", async (req, res) => {
    try {
      const validatedData = insertSavedMessageSchema.parse(req.body);
      const updatedMessage = await storage.updateSavedMessage(req.params.id, validatedData);
      if (!updatedMessage) {
        return res.status(404).json({ error: "Message not found" });
      }
      res.json(updatedMessage);
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
