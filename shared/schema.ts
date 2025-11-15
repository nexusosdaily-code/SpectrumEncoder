import { z } from "zod";
import { createInsertSchema } from "drizzle-zod";
import { pgTable, text, varchar, integer } from "drizzle-orm/pg-core";
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
