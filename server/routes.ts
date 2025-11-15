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

  // User Messaging Routes
  
  // Send a message to another user
  app.post("/api/messaging/send", async (req, res) => {
    try {
      if (!req.session || !req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const { recipientMobileNumber, messageContent } = req.body;
      
      if (!recipientMobileNumber || !messageContent) {
        return res.status(400).json({ error: "Recipient mobile number and message content are required" });
      }

      // Validate mobile number format (digits only, optionally with + prefix)
      const mobileRegex = /^\+?[0-9]+$/;
      if (!mobileRegex.test(recipientMobileNumber)) {
        return res.status(400).json({ error: "Invalid mobile number format. Use digits only (optionally starting with +)" });
      }

      const message = await storage.sendMessage(
        req.session.userId,
        recipientMobileNumber,
        messageContent
      );
      
      res.status(201).json(message);
    } catch (error) {
      res.status(500).json({ error: "Failed to send message" });
    }
  });

  // Get inbox messages (received by current user)
  app.get("/api/messaging/inbox", async (req, res) => {
    try {
      if (!req.session || !req.session.mobileNumber) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
      const result = await storage.listInbox(req.session.mobileNumber, limit);
      
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch inbox" });
    }
  });

  // Get sent messages (sent by current user)
  app.get("/api/messaging/sent", async (req, res) => {
    try {
      if (!req.session || !req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
      const result = await storage.listSent(req.session.userId, limit);
      
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch sent messages" });
    }
  });

  // Mark a message as read
  app.patch("/api/messaging/:id/read", async (req, res) => {
    try {
      if (!req.session || !req.session.mobileNumber) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      // Verify the message belongs to the current user before marking as read
      const message = await storage.markMessageRead(
        req.params.id,
        req.session.mobileNumber
      );
      
      if (!message) {
        return res.status(404).json({ error: "Message not found or you are not authorized to mark it as read" });
      }
      
      res.json(message);
    } catch (error) {
      res.status(500).json({ error: "Failed to mark message as read" });
    }
  });

  // Get unread message count
  app.get("/api/messaging/unread-count", async (req, res) => {
    try {
      if (!req.session || !req.session.mobileNumber) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const count = await storage.countUnread(req.session.mobileNumber);
      res.json({ count });
    } catch (error) {
      res.status(500).json({ error: "Failed to get unread count" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
