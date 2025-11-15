import { type SavedMessage, type InsertSavedMessage, savedMessages } from "@shared/schema";
import { randomUUID } from "crypto";
import { eq } from "drizzle-orm";
import { db } from "./db";

export interface IStorage {
  getSavedMessages(): Promise<SavedMessage[]>;
  getSavedMessage(id: string): Promise<SavedMessage | undefined>;
  createSavedMessage(message: InsertSavedMessage): Promise<SavedMessage>;
  updateSavedMessage(id: string, message: InsertSavedMessage): Promise<SavedMessage | undefined>;
  deleteSavedMessage(id: string): Promise<boolean>;
}

class MemStorage implements IStorage {
  private savedMessages: Map<string, SavedMessage>;

  constructor() {
    this.savedMessages = new Map();
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
