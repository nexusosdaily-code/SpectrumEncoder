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
  countryCode: varchar("country_code", { length: 5 }).notNull(), // e.g., "+1", "+44", "+91"
  mobileNumber: varchar("mobile_number", { length: 20 }).notNull().unique(),
  isVerified: varchar("is_verified", { length: 10 }).notNull().default('false'), // 'true' or 'false'
  verificationCode: varchar("verification_code", { length: 5 }), // 5-digit code
  verificationCodeExpiry: timestamp("verification_code_expiry"),
  latitude: text("latitude"), // User location latitude
  longitude: text("longitude"), // User location longitude
  displayName: varchar("display_name", { length: 100 }), // Optional display name
  bio: text("bio"), // User bio/description
  avatarUrl: text("avatar_url"), // Profile picture URL
  isOnline: varchar("is_online", { length: 10 }).notNull().default('false'), // Network node status
  lastSeen: timestamp("last_seen"), // Last active timestamp
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  isVerified: true,
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

// User followers/following relationships
export const userFollowers = pgTable("user_followers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  followerId: varchar("follower_id").notNull().references(() => users.id),
  followingId: varchar("following_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertUserFollowerSchema = createInsertSchema(userFollowers).omit({
  id: true,
  createdAt: true,
});

export type InsertUserFollower = z.infer<typeof insertUserFollowerSchema>;
export type UserFollower = typeof userFollowers.$inferSelect;

// Network security nodes - tracks active peer connections
export const networkNodes = pgTable("network_nodes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  ipAddress: varchar("ip_address", { length: 45 }), // IPv4 or IPv6
  userAgent: text("user_agent"), // Browser/device info
  isActive: varchar("is_active", { length: 10 }).notNull().default('true'),
  lastHeartbeat: timestamp("last_heartbeat").defaultNow().notNull(), // Last ping time
  peerConnections: integer("peer_connections").notNull().default(0), // Number of active peer connections
  securityScore: integer("security_score").notNull().default(100), // 0-100 security health score
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertNetworkNodeSchema = createInsertSchema(networkNodes).omit({
  id: true,
  createdAt: true,
  isActive: true,
  peerConnections: true,
  securityScore: true,
});

export type InsertNetworkNode = z.infer<typeof insertNetworkNodeSchema>;
export type NetworkNode = typeof networkNodes.$inferSelect;
