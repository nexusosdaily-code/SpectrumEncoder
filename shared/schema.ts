import { z } from "zod";
import { createInsertSchema } from "drizzle-zod";
import { pgTable, text, varchar, integer, timestamp } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// Encoding parameters schema
export const encodingParamsSchema = z.object({
  tsMs: z.number().min(50).max(500),
  tgMs: z.number().min(10).max(200),
});

export type EncodingParams = z.infer<typeof encodingParamsSchema>;

// Color signal element (for visualization)
export const colorSignalElementSchema = z.object({
  color: z.string(),
  letter: z.string().optional(),
  duration: z.number(),
  type: z.enum(['preamble-white', 'preamble-black', 'sof', 'eof', 'letter', 'guard', 'digit-pulse', 'mini-guard', 'calibration-white', 'calibration-black', 'calibration-ref']),
  wavelengthNm: z.number().optional(),
  digitValue: z.number().optional(), // 0-9 for digit pulses
  brightness: z.number().optional(), // 0-1 brightness level for digit pulses
});

export type ColorSignalElement = z.infer<typeof colorSignalElementSchema>;

// Saved messages table (optional - for persistence)
export const savedMessages = pgTable("saved_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  message: text("message").notNull(),
  tsMs: integer("ts_ms").notNull(),
  tgMs: integer("tg_ms").notNull(),
});

export const insertSavedMessageSchema = createInsertSchema(savedMessages).omit({
  id: true,
});

export type InsertSavedMessage = z.infer<typeof insertSavedMessageSchema>;
export type SavedMessage = typeof savedMessages.$inferSelect;

// Users table for mobile number authentication
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  mobileNumber: varchar("mobile_number", { length: 20 }).notNull().unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// User messages table for in-app messaging
export const userMessages = pgTable("user_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  senderId: varchar("sender_id").notNull().references(() => users.id),
  recipientMobileNumber: varchar("recipient_mobile_number", { length: 20 }).notNull(),
  messageContent: text("message_content").notNull(),
  status: varchar("status", { length: 20 }).notNull().default('pending'), // 'pending' or 'read'
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertUserMessageSchema = createInsertSchema(userMessages).omit({
  id: true,
  createdAt: true,
  status: true,
});

export type InsertUserMessage = z.infer<typeof insertUserMessageSchema>;
export type UserMessage = typeof userMessages.$inferSelect;
