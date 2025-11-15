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

// Network security nodes - P2P DAG network participants
export const networkNodes = pgTable("network_nodes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  peerId: text("peer_id").notNull().unique(), // libp2p peer ID
  publicKey: text("public_key").notNull(), // Ed25519 public key for signing
  ipAddress: varchar("ip_address", { length: 45 }), // IPv4 or IPv6
  userAgent: text("user_agent"), // Browser/device info
  isActive: varchar("is_active", { length: 10 }).notNull().default('true'),
  lastHeartbeat: timestamp("last_heartbeat").defaultNow().notNull(),
  peerConnections: integer("peer_connections").notNull().default(0),
  
  // Proof-of-Engagement metrics
  engagementScore: integer("engagement_score").notNull().default(0), // Cumulative engagement points
  messagesRelayed: integer("messages_relayed").notNull().default(0), // Total messages forwarded
  decodingAccuracy: integer("decoding_accuracy").notNull().default(100), // 0-100 percentage
  uptimeMinutes: integer("uptime_minutes").notNull().default(0), // Total uptime in minutes
  ledgerContributions: integer("ledger_contributions").notNull().default(0), // DAG vertices posted
  
  // Security and trust
  securityScore: integer("security_score").notNull().default(100), // 0-100 security health score
  trustScore: integer("trust_score").notNull().default(50), // 0-100 peer trust rating
  reputationStake: integer("reputation_stake").notNull().default(0), // Staked reputation points
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertNetworkNodeSchema = createInsertSchema(networkNodes).omit({
  id: true,
  createdAt: true,
  isActive: true,
  peerConnections: true,
  engagementScore: true,
  messagesRelayed: true,
  decodingAccuracy: true,
  uptimeMinutes: true,
  ledgerContributions: true,
  securityScore: true,
  trustScore: true,
  reputationStake: true,
});

export type InsertNetworkNode = z.infer<typeof insertNetworkNodeSchema>;
export type NetworkNode = typeof networkNodes.$inferSelect;

// DAG Ledger Vertices - Tangle-inspired verification ledger
export const dagVertices = pgTable("dag_vertices", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  vertexHash: text("vertex_hash").notNull().unique(), // Content-addressed hash
  nodeId: varchar("node_id").notNull().references(() => networkNodes.id),
  
  // DAG structure
  tipReference1: text("tip_reference_1").notNull(), // First parent vertex hash
  tipReference2: text("tip_reference_2").notNull(), // Second parent vertex hash
  depth: integer("depth").notNull().default(0), // Distance from genesis
  cumulativeWeight: integer("cumulative_weight").notNull().default(1), // Confirmations
  
  // Payload
  payloadType: varchar("payload_type", { length: 50 }).notNull(), // 'message', 'verification', 'engagement'
  payloadHash: text("payload_hash").notNull(), // Hash of actual message/data
  payloadData: text("payload_data"), // Optional inline data (small payloads)
  
  // Proof-of-Engagement
  engagementProof: text("engagement_proof").notNull(), // Signed attestation
  workProof: text("work_proof"), // Optional VDF or computational proof
  
  // Verification and trust
  signature: text("signature").notNull(), // Node's signature over vertex
  isAnchored: varchar("is_anchored", { length: 10 }).notNull().default('false'), // Checkpointed to server
  anchorTimestamp: timestamp("anchor_timestamp"),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertDagVertexSchema = createInsertSchema(dagVertices).omit({
  id: true,
  createdAt: true,
  cumulativeWeight: true,
  isAnchored: true,
});

export type InsertDagVertex = z.infer<typeof insertDagVertexSchema>;
export type DagVertex = typeof dagVertices.$inferSelect;

// Proof-of-Engagement records - tracks network participation
export const proofOfEngagement = pgTable("proof_of_engagement", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  nodeId: varchar("node_id").notNull().references(() => networkNodes.id),
  
  // Engagement event details
  eventType: varchar("event_type", { length: 50 }).notNull(), // 'relay', 'decode', 'verify', 'heartbeat'
  eventData: text("event_data"), // JSON payload with event details
  
  // Scoring
  pointsEarned: integer("points_earned").notNull().default(1),
  difficulty: integer("difficulty").notNull().default(1), // Dynamic difficulty level
  
  // Verification
  attestation: text("attestation").notNull(), // Cryptographic proof
  witnessNodeIds: text("witness_node_ids"), // Comma-separated peer IDs that witnessed event
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertProofOfEngagementSchema = createInsertSchema(proofOfEngagement).omit({
  id: true,
  createdAt: true,
});

export type InsertProofOfEngagement = z.infer<typeof insertProofOfEngagementSchema>;
export type ProofOfEngagement = typeof proofOfEngagement.$inferSelect;

// Code Shards - distributed WASM module storage
export const codeShards = pgTable("code_shards", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Shard identification
  moduleId: text("module_id").notNull(), // e.g., 'encoder-v1.2.0', 'verifier-v1.0.1'
  shardIndex: integer("shard_index").notNull(), // Position in erasure-coded sequence
  totalShards: integer("total_shards").notNull(), // Total shards for this module
  
  // Content addressing
  contentHash: text("content_hash").notNull().unique(), // IPFS-style CID
  merkleRoot: text("merkle_root").notNull(), // Root of Merkle tree for verification
  
  // Shard data
  shardData: text("shard_data").notNull(), // Base64-encoded WASM chunk or code
  compressionType: varchar("compression_type", { length: 20 }), // 'gzip', 'brotli', 'none'
  
  // Distribution tracking
  replicationFactor: integer("replication_factor").notNull().default(3), // Target copies
  currentReplicas: integer("current_replicas").notNull().default(0), // Actual copies in network
  hostingNodes: text("hosting_nodes"), // Comma-separated peer IDs hosting this shard
  
  // Metadata
  version: varchar("version", { length: 20 }).notNull(),
  capability: varchar("capability", { length: 50 }).notNull(), // 'encode', 'decode', 'verify', 'relay'
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertCodeShardSchema = createInsertSchema(codeShards).omit({
  id: true,
  createdAt: true,
  currentReplicas: true,
});

export type InsertCodeShard = z.infer<typeof insertCodeShardSchema>;
export type CodeShard = typeof codeShards.$inferSelect;
