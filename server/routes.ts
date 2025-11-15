import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertSavedMessageSchema, insertUserSchema } from "@shared/schema";
import { z } from "zod";
import "./types"; // Import session type declarations

// Twilio client setup
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const verifyServiceSid = process.env.TWILIO_VERIFY_SERVICE_SID;

// Mobile number validation schema
const mobileNumberSchema = z.string().regex(/^\+?[1-9]\d{1,14}$/, "Invalid mobile number format");

// Generate random 5-digit code
function generate5DigitCode(): string {
  return Math.floor(10000 + Math.random() * 90000).toString();
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Authentication routes
  
  // Register user with country code and mobile number
  app.post("/api/auth/register", async (req, res) => {
    try {
      const { countryCode, mobileNumber } = req.body;
      
      if (!countryCode || !mobileNumber) {
        return res.status(400).json({ error: "Country code and mobile number are required" });
      }
      
      const fullNumber = `${countryCode}${mobileNumber}`;
      const validated = mobileNumberSchema.parse(fullNumber);
      
      // Check if user already exists
      const existingUser = await storage.getUserByMobileNumber(validated);
      if (existingUser) {
        return res.status(400).json({ error: "User already exists with this mobile number" });
      }
      
      // Create new user (not yet verified)
      const user = await storage.createUser({ 
        countryCode, 
        mobileNumber: validated 
      });
      
      res.status(201).json({ 
        message: "User registered successfully. Please verify your mobile number.",
        user: { id: user.id, mobileNumber: user.mobileNumber }
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid mobile number format" });
      }
      console.error("Registration error:", error);
      res.status(500).json({ error: "Registration failed" });
    }
  });

  // Send verification code via SMS
  app.post("/api/auth/send-verification", async (req, res) => {
    try {
      const { mobileNumber } = req.body;
      const validated = mobileNumberSchema.parse(mobileNumber);
      
      // Check if user exists
      const user = await storage.getUserByMobileNumber(validated);
      if (!user) {
        return res.status(404).json({ error: "User not found. Please register first." });
      }
      
      // Generate 5-digit code
      const code = generate5DigitCode();
      const expiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
      
      // Store verification code
      await storage.updateUserVerificationCode(validated, code, expiry);
      
      // Send SMS via Twilio Programmable Messaging (with fallback to dev mode)
      let smsSent = false;
      
      if (accountSid && authToken) {
        try {
          // Use Programmable Messaging API to send custom verification code
          const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER || verifyServiceSid || "";
          if (!twilioPhoneNumber) {
            console.warn("No Twilio phone number configured, using dev mode");
          } else {
            const smsBody = `Your verification code is: ${code}. This code expires in 10 minutes.`;
            
            const params = new URLSearchParams();
            params.append('To', validated);
            params.append('From', twilioPhoneNumber);
            params.append('Body', smsBody);
            
            const response = await fetch(
              `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/x-www-form-urlencoded',
                  'Authorization': 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64')
                },
                body: params
              }
            );
            
            if (response.ok) {
              smsSent = true;
              const data = await response.json();
              console.log(`SMS sent successfully to ${validated}, SID: ${data.sid}`);
              res.json({ message: "Verification code sent successfully" });
            } else {
              const errorData = await response.json();
              console.warn("Twilio error (falling back to dev mode):", errorData);
              // Fall through to dev mode
            }
          }
        } catch (twilioError) {
          console.warn("Twilio API error (falling back to dev mode):", twilioError);
          // Fall through to dev mode
        }
      }
      
      // Development mode / Twilio fallback - return code in response (for testing)
      if (!smsSent) {
        console.log(`[DEV MODE] Verification code for ${validated}: ${code}`);
        res.json({ 
          message: "Verification code generated (dev mode)", 
          code // Only in dev mode
        });
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid mobile number format" });
      }
      console.error("Send verification error:", error);
      res.status(500).json({ error: "Failed to send verification code" });
    }
  });

  // Verify code and activate account
  app.post("/api/auth/verify-code", async (req, res) => {
    try {
      const { mobileNumber, code } = req.body;
      
      if (!mobileNumber || !code) {
        return res.status(400).json({ error: "Mobile number and code are required" });
      }
      
      const validated = mobileNumberSchema.parse(mobileNumber);
      
      // Verify the code
      const user = await storage.verifyUserCode(validated, code);
      
      if (!user) {
        return res.status(400).json({ error: "Invalid or expired verification code" });
      }
      
      // Set session - user is now authenticated
      req.session.userId = user.id;
      req.session.mobileNumber = user.mobileNumber;
      
      res.json({ 
        message: "Account verified successfully",
        user: { id: user.id, mobileNumber: user.mobileNumber }
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid mobile number format" });
      }
      console.error("Verification error:", error);
      res.status(500).json({ error: "Verification failed" });
    }
  });

  // Update user location
  app.post("/api/auth/update-location", async (req, res) => {
    try {
      if (!req.session || !req.session.mobileNumber) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      const { latitude, longitude } = req.body;
      
      if (!latitude || !longitude) {
        return res.status(400).json({ error: "Latitude and longitude are required" });
      }
      
      const user = await storage.updateUserLocation(
        req.session.mobileNumber,
        latitude.toString(),
        longitude.toString()
      );
      
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      
      res.json({ 
        message: "Location updated successfully",
        location: { latitude, longitude }
      });
    } catch (error) {
      console.error("Update location error:", error);
      res.status(500).json({ error: "Failed to update location" });
    }
  });

  // Legacy login route (deprecated - kept for backwards compatibility)
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { mobileNumber } = req.body;
      const validated = mobileNumberSchema.parse(mobileNumber);
      
      // Check if user exists
      let user = await storage.getUserByMobileNumber(validated);
      
      // Create new user if doesn't exist
      if (!user) {
        user = await storage.createUser({ 
          countryCode: "+1", // Default for legacy
          mobileNumber: validated 
        });
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
