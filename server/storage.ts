import { type SavedMessage, type InsertSavedMessage, savedMessages, type User, type InsertUser, users, type UserMessage, type InsertUserMessage, userMessages } from "@shared/schema";
import { randomUUID } from "crypto";
import { eq, desc, and, or } from "drizzle-orm";
import { db } from "./db";

export interface MessageWithSender extends UserMessage {
  senderMobileNumber?: string;
}

export interface MessageListResult {
  messages: MessageWithSender[];
  hasMore: boolean;
}

export interface IStorage {
  getSavedMessages(): Promise<SavedMessage[]>;
  getSavedMessage(id: string): Promise<SavedMessage | undefined>;
  createSavedMessage(message: InsertSavedMessage): Promise<SavedMessage>;
  updateSavedMessage(id: string, message: InsertSavedMessage): Promise<SavedMessage | undefined>;
  deleteSavedMessage(id: string): Promise<boolean>;
  
  // User operations
  getUserByMobileNumber(mobileNumber: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Messaging operations
  sendMessage(senderId: string, recipientMobileNumber: string, messageContent: string): Promise<UserMessage>;
  listInbox(recipientMobileNumber: string, limit?: number): Promise<MessageListResult>;
  listSent(senderId: string, limit?: number): Promise<MessageListResult>;
  markMessageRead(messageId: string, recipientMobileNumber: string): Promise<UserMessage | undefined>;
  countUnread(recipientMobileNumber: string): Promise<number>;
}

class MemStorage implements IStorage {
  private savedMessages: Map<string, SavedMessage>;
  private users: Map<string, User>;
  private userMessages: Map<string, UserMessage>;

  constructor() {
    this.savedMessages = new Map();
    this.users = new Map();
    this.userMessages = new Map();
  }

  async getSavedMessages(): Promise<SavedMessage[]> {
    return Array.from(this.savedMessages.values());
  }

  async getSavedMessage(id: string): Promise<SavedMessage | undefined> {
    return this.savedMessages.get(id);
  }

  async createSavedMessage(insertMessage: InsertSavedMessage): Promise<SavedMessage> {
    const id = randomUUID();
    const savedMessage: SavedMessage = { ...insertMessage, id };
    this.savedMessages.set(id, savedMessage);
    return savedMessage;
  }

  async updateSavedMessage(id: string, insertMessage: InsertSavedMessage): Promise<SavedMessage | undefined> {
    if (!this.savedMessages.has(id)) {
      return undefined;
    }
    const savedMessage: SavedMessage = { ...insertMessage, id };
    this.savedMessages.set(id, savedMessage);
    return savedMessage;
  }

  async deleteSavedMessage(id: string): Promise<boolean> {
    return this.savedMessages.delete(id);
  }

  async getUserByMobileNumber(mobileNumber: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(u => u.mobileNumber === mobileNumber);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id, createdAt: new Date() };
    this.users.set(id, user);
    return user;
  }

  async sendMessage(senderId: string, recipientMobileNumber: string, messageContent: string): Promise<UserMessage> {
    const id = randomUUID();
    const message: UserMessage = {
      id,
      senderId,
      recipientMobileNumber,
      messageContent,
      status: 'pending',
      createdAt: new Date(),
    };
    this.userMessages.set(id, message);
    return message;
  }

  async listInbox(recipientMobileNumber: string, limit = 50): Promise<MessageListResult> {
    const messages = Array.from(this.userMessages.values())
      .filter(m => m.recipientMobileNumber === recipientMobileNumber)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit + 1)
      .map(msg => {
        const sender = Array.from(this.users.values()).find(u => u.id === msg.senderId);
        return {
          ...msg,
          senderMobileNumber: sender?.mobileNumber
        } as MessageWithSender;
      });
    
    const hasMore = messages.length > limit;
    return {
      messages: messages.slice(0, limit),
      hasMore
    };
  }

  async listSent(senderId: string, limit = 50): Promise<MessageListResult> {
    const messages = Array.from(this.userMessages.values())
      .filter(m => m.senderId === senderId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit + 1);
    
    const hasMore = messages.length > limit;
    return {
      messages: messages.slice(0, limit),
      hasMore
    };
  }

  async markMessageRead(messageId: string, recipientMobileNumber: string): Promise<UserMessage | undefined> {
    const message = this.userMessages.get(messageId);
    if (!message || message.recipientMobileNumber !== recipientMobileNumber) {
      return undefined;
    }
    const updated: UserMessage = { ...message, status: 'read' };
    this.userMessages.set(messageId, updated);
    return updated;
  }

  async countUnread(recipientMobileNumber: string): Promise<number> {
    return Array.from(this.userMessages.values())
      .filter(m => m.recipientMobileNumber === recipientMobileNumber && m.status === 'pending')
      .length;
  }
}

class DbStorage implements IStorage {
  private db = db;

  async getSavedMessages(): Promise<SavedMessage[]> {
    return await this.db.select().from(savedMessages);
  }

  async getSavedMessage(id: string): Promise<SavedMessage | undefined> {
    const results = await this.db.select().from(savedMessages).where(eq(savedMessages.id, id));
    return results[0];
  }

  async createSavedMessage(insertMessage: InsertSavedMessage): Promise<SavedMessage> {
    const results = await this.db.insert(savedMessages).values(insertMessage).returning();
    return results[0];
  }

  async updateSavedMessage(id: string, insertMessage: InsertSavedMessage): Promise<SavedMessage | undefined> {
    const results = await this.db.update(savedMessages)
      .set(insertMessage)
      .where(eq(savedMessages.id, id))
      .returning();
    return results[0];
  }

  async deleteSavedMessage(id: string): Promise<boolean> {
    const results = await this.db.delete(savedMessages).where(eq(savedMessages.id, id)).returning();
    return results.length > 0;
  }

  async getUserByMobileNumber(mobileNumber: string): Promise<User | undefined> {
    const results = await this.db.select().from(users).where(eq(users.mobileNumber, mobileNumber));
    return results[0];
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const results = await this.db.insert(users).values(insertUser).returning();
    return results[0];
  }

  async sendMessage(senderId: string, recipientMobileNumber: string, messageContent: string): Promise<UserMessage> {
    const results = await this.db.insert(userMessages).values({
      senderId,
      recipientMobileNumber,
      messageContent,
    }).returning();
    return results[0];
  }

  async listInbox(recipientMobileNumber: string, limit = 50): Promise<MessageListResult> {
    const messages = await this.db.select({
      id: userMessages.id,
      senderId: userMessages.senderId,
      recipientMobileNumber: userMessages.recipientMobileNumber,
      messageContent: userMessages.messageContent,
      status: userMessages.status,
      createdAt: userMessages.createdAt,
      senderMobileNumber: users.mobileNumber,
    }).from(userMessages)
      .leftJoin(users, eq(userMessages.senderId, users.id))
      .where(eq(userMessages.recipientMobileNumber, recipientMobileNumber))
      .orderBy(desc(userMessages.createdAt))
      .limit(limit + 1);
    
    const hasMore = messages.length > limit;
    return {
      messages: messages.slice(0, limit) as MessageWithSender[],
      hasMore
    };
  }

  async listSent(senderId: string, limit = 50): Promise<MessageListResult> {
    const messages = await this.db.select().from(userMessages)
      .where(eq(userMessages.senderId, senderId))
      .orderBy(desc(userMessages.createdAt))
      .limit(limit + 1);
    
    const hasMore = messages.length > limit;
    return {
      messages: messages.slice(0, limit),
      hasMore
    };
  }

  async markMessageRead(messageId: string, recipientMobileNumber: string): Promise<UserMessage | undefined> {
    const results = await this.db.update(userMessages)
      .set({ status: 'read' })
      .where(and(
        eq(userMessages.id, messageId),
        eq(userMessages.recipientMobileNumber, recipientMobileNumber)
      ))
      .returning();
    return results[0];
  }

  async countUnread(recipientMobileNumber: string): Promise<number> {
    const results = await this.db.select().from(userMessages)
      .where(and(
        eq(userMessages.recipientMobileNumber, recipientMobileNumber),
        eq(userMessages.status, 'pending')
      ));
    return results.length;
  }
}

function createStorage(): IStorage {
  if (process.env.DATABASE_URL) {
    try {
      return new DbStorage();
    } catch (error) {
      console.warn("Failed to initialize database storage, falling back to memory storage:", error);
      return new MemStorage();
    }
  }
  return new MemStorage();
}

export const storage = createStorage();
