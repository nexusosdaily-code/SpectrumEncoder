import { type SavedMessage, type InsertSavedMessage, savedMessages, type User, type InsertUser, users, type UserMessage, type InsertUserMessage, userMessages, type UserFollower, type InsertUserFollower, userFollowers, type NetworkNode, type InsertNetworkNode, networkNodes } from "@shared/schema";
import { randomUUID } from "crypto";
import { eq, desc, and, or, ilike, sql, count } from "drizzle-orm";
import { db } from "./db";

export interface MessageWithSender extends UserMessage {
  senderMobileNumber?: string;
}

export interface MessageListResult {
  messages: MessageWithSender[];
  hasMore: boolean;
}

export interface UserProfile extends User {
  followerCount: number;
  followingCount: number;
  isFollowing?: boolean;
}

export interface NetworkStats {
  totalNodes: number;
  activeNodes: number;
  avgSecurityScore: number;
  totalPeerConnections: number;
}

export interface IStorage {
  getSavedMessages(): Promise<SavedMessage[]>;
  getSavedMessage(id: string): Promise<SavedMessage | undefined>;
  createSavedMessage(message: InsertSavedMessage): Promise<SavedMessage>;
  updateSavedMessage(id: string, message: InsertSavedMessage): Promise<SavedMessage | undefined>;
  deleteSavedMessage(id: string): Promise<boolean>;
  
  // User operations
  getUserByMobileNumber(mobileNumber: string): Promise<User | undefined>;
  getUserById(id: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserVerificationCode(mobileNumber: string, code: string, expiry: Date): Promise<User | undefined>;
  verifyUserCode(mobileNumber: string, code: string): Promise<User | undefined>;
  updateUserLocation(mobileNumber: string, latitude: string, longitude: string): Promise<User | undefined>;
  updateUserProfile(userId: string, updates: { displayName?: string; bio?: string; avatarUrl?: string }): Promise<User | undefined>;
  updateUserOnlineStatus(userId: string, isOnline: boolean): Promise<User | undefined>;
  searchUsers(query: string, limit?: number): Promise<User[]>;
  
  // Follower operations
  followUser(followerId: string, followingId: string): Promise<UserFollower>;
  unfollowUser(followerId: string, followingId: string): Promise<boolean>;
  isFollowing(followerId: string, followingId: string): Promise<boolean>;
  getUserProfile(userId: string, viewerId?: string): Promise<UserProfile | undefined>;
  getFollowers(userId: string, limit?: number): Promise<User[]>;
  getFollowing(userId: string, limit?: number): Promise<User[]>;
  
  // Network security operations
  createNetworkNode(node: InsertNetworkNode): Promise<NetworkNode>;
  updateNodeHeartbeat(nodeId: string, peerConnections: number): Promise<NetworkNode | undefined>;
  deactivateNode(nodeId: string): Promise<boolean>;
  getUserNodes(userId: string): Promise<NetworkNode[]>;
  getNetworkStats(): Promise<NetworkStats>;
  getActiveNodes(limit?: number): Promise<NetworkNode[]>;
  
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
  private userFollowers: Map<string, UserFollower>;
  private networkNodes: Map<string, NetworkNode>;

  constructor() {
    this.savedMessages = new Map();
    this.users = new Map();
    this.userMessages = new Map();
    this.userFollowers = new Map();
    this.networkNodes = new Map();
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
    const user: User = { 
      ...insertUser, 
      id, 
      isVerified: 'false',
      verificationCode: insertUser.verificationCode ?? null,
      verificationCodeExpiry: insertUser.verificationCodeExpiry ?? null,
      latitude: insertUser.latitude ?? null,
      longitude: insertUser.longitude ?? null,
      displayName: insertUser.displayName ?? null,
      bio: insertUser.bio ?? null,
      avatarUrl: insertUser.avatarUrl ?? null,
      isOnline: insertUser.isOnline ?? 'false',
      lastSeen: insertUser.lastSeen ?? null,
      createdAt: new Date() 
    };
    this.users.set(id, user);
    return user;
  }

  async updateUserVerificationCode(mobileNumber: string, code: string, expiry: Date): Promise<User | undefined> {
    const user = Array.from(this.users.values()).find(u => u.mobileNumber === mobileNumber);
    if (!user) return undefined;
    
    const updated: User = {
      ...user,
      verificationCode: code,
      verificationCodeExpiry: expiry,
    };
    this.users.set(user.id, updated);
    return updated;
  }

  async verifyUserCode(mobileNumber: string, code: string): Promise<User | undefined> {
    const user = Array.from(this.users.values()).find(u => u.mobileNumber === mobileNumber);
    if (!user || !user.verificationCode || !user.verificationCodeExpiry) {
      return undefined;
    }

    // Check if code matches and hasn't expired
    if (user.verificationCode !== code) {
      return undefined;
    }

    if (new Date() > user.verificationCodeExpiry) {
      return undefined;
    }

    // Mark user as verified and clear verification code
    const updated: User = {
      ...user,
      isVerified: 'true',
      verificationCode: null,
      verificationCodeExpiry: null,
    };
    this.users.set(user.id, updated);
    return updated;
  }

  async updateUserLocation(mobileNumber: string, latitude: string, longitude: string): Promise<User | undefined> {
    const user = Array.from(this.users.values()).find(u => u.mobileNumber === mobileNumber);
    if (!user) return undefined;
    
    const updated: User = {
      ...user,
      latitude,
      longitude,
    };
    this.users.set(user.id, updated);
    return updated;
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

  async getUserById(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async updateUserProfile(userId: string, updates: { displayName?: string; bio?: string; avatarUrl?: string }): Promise<User | undefined> {
    const user = this.users.get(userId);
    if (!user) return undefined;

    const updated: User = {
      ...user,
      ...(updates.displayName !== undefined && { displayName: updates.displayName }),
      ...(updates.bio !== undefined && { bio: updates.bio }),
      ...(updates.avatarUrl !== undefined && { avatarUrl: updates.avatarUrl }),
    };
    this.users.set(userId, updated);
    return updated;
  }

  async updateUserOnlineStatus(userId: string, isOnline: boolean): Promise<User | undefined> {
    const user = this.users.get(userId);
    if (!user) return undefined;

    const updated: User = {
      ...user,
      isOnline: isOnline ? 'true' : 'false',
      lastSeen: new Date(),
    };
    this.users.set(userId, updated);
    return updated;
  }

  async searchUsers(query: string, limit = 20): Promise<User[]> {
    const lowerQuery = query.toLowerCase();
    return Array.from(this.users.values())
      .filter(u => 
        (u.displayName && u.displayName.toLowerCase().includes(lowerQuery)) ||
        u.mobileNumber.toLowerCase().includes(lowerQuery)
      )
      .slice(0, limit);
  }

  async followUser(followerId: string, followingId: string): Promise<UserFollower> {
    if (followerId === followingId) {
      throw new Error("Cannot follow yourself");
    }

    const existing = Array.from(this.userFollowers.values()).find(
      f => f.followerId === followerId && f.followingId === followingId
    );
    
    if (existing) {
      return existing;
    }

    const id = randomUUID();
    const follower: UserFollower = {
      id,
      followerId,
      followingId,
      createdAt: new Date(),
    };
    this.userFollowers.set(id, follower);
    return follower;
  }

  async unfollowUser(followerId: string, followingId: string): Promise<boolean> {
    const existing = Array.from(this.userFollowers.entries()).find(
      ([_, f]) => f.followerId === followerId && f.followingId === followingId
    );
    
    if (!existing) return false;
    
    return this.userFollowers.delete(existing[0]);
  }

  async isFollowing(followerId: string, followingId: string): Promise<boolean> {
    return Array.from(this.userFollowers.values()).some(
      f => f.followerId === followerId && f.followingId === followingId
    );
  }

  async getUserProfile(userId: string, viewerId?: string): Promise<UserProfile | undefined> {
    const user = this.users.get(userId);
    if (!user) return undefined;

    const followerCount = Array.from(this.userFollowers.values()).filter(
      f => f.followingId === userId
    ).length;

    const followingCount = Array.from(this.userFollowers.values()).filter(
      f => f.followerId === userId
    ).length;

    let isFollowing: boolean | undefined = undefined;
    if (viewerId) {
      isFollowing = await this.isFollowing(viewerId, userId);
    }

    return {
      ...user,
      followerCount,
      followingCount,
      isFollowing,
    };
  }

  async getFollowers(userId: string, limit = 50): Promise<User[]> {
    const followerIds = Array.from(this.userFollowers.values())
      .filter(f => f.followingId === userId)
      .map(f => f.followerId)
      .slice(0, limit);

    return followerIds
      .map(id => this.users.get(id))
      .filter((u): u is User => u !== undefined);
  }

  async getFollowing(userId: string, limit = 50): Promise<User[]> {
    const followingIds = Array.from(this.userFollowers.values())
      .filter(f => f.followerId === userId)
      .map(f => f.followingId)
      .slice(0, limit);

    return followingIds
      .map(id => this.users.get(id))
      .filter((u): u is User => u !== undefined);
  }

  async createNetworkNode(node: InsertNetworkNode): Promise<NetworkNode> {
    const id = randomUUID();
    const networkNode: NetworkNode = {
      ...node,
      id,
      ipAddress: node.ipAddress ?? null,
      userAgent: node.userAgent ?? null,
      isActive: 'true',
      lastHeartbeat: new Date(),
      peerConnections: 0,
      securityScore: 100,
      createdAt: new Date(),
    };
    this.networkNodes.set(id, networkNode);
    return networkNode;
  }

  async updateNodeHeartbeat(nodeId: string, peerConnections: number): Promise<NetworkNode | undefined> {
    const node = this.networkNodes.get(nodeId);
    if (!node) return undefined;

    const updated: NetworkNode = {
      ...node,
      lastHeartbeat: new Date(),
      peerConnections,
    };
    this.networkNodes.set(nodeId, updated);
    return updated;
  }

  async deactivateNode(nodeId: string): Promise<boolean> {
    const node = this.networkNodes.get(nodeId);
    if (!node) return false;

    const updated: NetworkNode = {
      ...node,
      isActive: 'false',
    };
    this.networkNodes.set(nodeId, updated);
    return true;
  }

  async getUserNodes(userId: string): Promise<NetworkNode[]> {
    return Array.from(this.networkNodes.values())
      .filter(n => n.userId === userId);
  }

  async getNetworkStats(): Promise<NetworkStats> {
    const nodes = Array.from(this.networkNodes.values());
    const activeNodes = nodes.filter(n => n.isActive === 'true');

    const totalNodes = nodes.length;
    const totalActiveNodes = activeNodes.length;
    const totalPeerConnections = activeNodes.reduce((sum, n) => sum + n.peerConnections, 0);
    const avgSecurityScore = totalActiveNodes > 0
      ? activeNodes.reduce((sum, n) => sum + n.securityScore, 0) / totalActiveNodes
      : 0;

    return {
      totalNodes,
      activeNodes: totalActiveNodes,
      avgSecurityScore,
      totalPeerConnections,
    };
  }

  async getActiveNodes(limit = 100): Promise<NetworkNode[]> {
    return Array.from(this.networkNodes.values())
      .filter(n => n.isActive === 'true')
      .sort((a, b) => b.lastHeartbeat.getTime() - a.lastHeartbeat.getTime())
      .slice(0, limit);
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

  async updateUserVerificationCode(mobileNumber: string, code: string, expiry: Date): Promise<User | undefined> {
    const results = await this.db.update(users)
      .set({
        verificationCode: code,
        verificationCodeExpiry: expiry,
      })
      .where(eq(users.mobileNumber, mobileNumber))
      .returning();
    return results[0];
  }

  async verifyUserCode(mobileNumber: string, code: string): Promise<User | undefined> {
    const userResults = await this.db.select().from(users).where(eq(users.mobileNumber, mobileNumber));
    const user = userResults[0];
    
    if (!user || !user.verificationCode || !user.verificationCodeExpiry) {
      return undefined;
    }

    // Check if code matches and hasn't expired
    if (user.verificationCode !== code) {
      return undefined;
    }

    if (new Date() > user.verificationCodeExpiry) {
      return undefined;
    }

    // Mark user as verified and clear verification code
    const results = await this.db.update(users)
      .set({
        isVerified: 'true',
        verificationCode: null,
        verificationCodeExpiry: null,
      })
      .where(eq(users.mobileNumber, mobileNumber))
      .returning();
    return results[0];
  }

  async updateUserLocation(mobileNumber: string, latitude: string, longitude: string): Promise<User | undefined> {
    const results = await this.db.update(users)
      .set({
        latitude,
        longitude,
      })
      .where(eq(users.mobileNumber, mobileNumber))
      .returning();
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

  async getUserById(id: string): Promise<User | undefined> {
    const results = await this.db.select().from(users).where(eq(users.id, id));
    return results[0];
  }

  async updateUserProfile(userId: string, updates: { displayName?: string; bio?: string; avatarUrl?: string }): Promise<User | undefined> {
    const updateData: Partial<User> = {};
    if (updates.displayName !== undefined) updateData.displayName = updates.displayName;
    if (updates.bio !== undefined) updateData.bio = updates.bio;
    if (updates.avatarUrl !== undefined) updateData.avatarUrl = updates.avatarUrl;

    if (Object.keys(updateData).length === 0) {
      return await this.getUserById(userId);
    }

    const results = await this.db.update(users)
      .set(updateData)
      .where(eq(users.id, userId))
      .returning();
    return results[0];
  }

  async updateUserOnlineStatus(userId: string, isOnline: boolean): Promise<User | undefined> {
    const results = await this.db.update(users)
      .set({
        isOnline: isOnline ? 'true' : 'false',
        lastSeen: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();
    return results[0];
  }

  async searchUsers(query: string, limit = 20): Promise<User[]> {
    const searchPattern = `%${query}%`;
    const results = await this.db.select().from(users)
      .where(
        or(
          ilike(users.displayName, searchPattern),
          ilike(users.mobileNumber, searchPattern)
        )
      )
      .limit(limit);
    return results;
  }

  async followUser(followerId: string, followingId: string): Promise<UserFollower> {
    if (followerId === followingId) {
      throw new Error("Cannot follow yourself");
    }

    const existing = await this.db.select().from(userFollowers)
      .where(and(
        eq(userFollowers.followerId, followerId),
        eq(userFollowers.followingId, followingId)
      ));

    if (existing.length > 0) {
      return existing[0];
    }

    const results = await this.db.insert(userFollowers).values({
      followerId,
      followingId,
    }).returning();
    return results[0];
  }

  async unfollowUser(followerId: string, followingId: string): Promise<boolean> {
    const results = await this.db.delete(userFollowers)
      .where(and(
        eq(userFollowers.followerId, followerId),
        eq(userFollowers.followingId, followingId)
      ))
      .returning();
    return results.length > 0;
  }

  async isFollowing(followerId: string, followingId: string): Promise<boolean> {
    const results = await this.db.select().from(userFollowers)
      .where(and(
        eq(userFollowers.followerId, followerId),
        eq(userFollowers.followingId, followingId)
      ));
    return results.length > 0;
  }

  async getUserProfile(userId: string, viewerId?: string): Promise<UserProfile | undefined> {
    const userResult = await this.db.select().from(users).where(eq(users.id, userId));
    const user = userResult[0];
    if (!user) return undefined;

    const followerCountResult = await this.db
      .select({ count: count() })
      .from(userFollowers)
      .where(eq(userFollowers.followingId, userId));
    const followerCount = followerCountResult[0]?.count || 0;

    const followingCountResult = await this.db
      .select({ count: count() })
      .from(userFollowers)
      .where(eq(userFollowers.followerId, userId));
    const followingCount = followingCountResult[0]?.count || 0;

    let isFollowing: boolean | undefined = undefined;
    if (viewerId) {
      isFollowing = await this.isFollowing(viewerId, userId);
    }

    return {
      ...user,
      followerCount: Number(followerCount),
      followingCount: Number(followingCount),
      isFollowing,
    };
  }

  async getFollowers(userId: string, limit = 50): Promise<User[]> {
    const results = await this.db
      .select({
        id: users.id,
        countryCode: users.countryCode,
        mobileNumber: users.mobileNumber,
        isVerified: users.isVerified,
        verificationCode: users.verificationCode,
        verificationCodeExpiry: users.verificationCodeExpiry,
        latitude: users.latitude,
        longitude: users.longitude,
        displayName: users.displayName,
        bio: users.bio,
        avatarUrl: users.avatarUrl,
        isOnline: users.isOnline,
        lastSeen: users.lastSeen,
        createdAt: users.createdAt,
      })
      .from(userFollowers)
      .innerJoin(users, eq(userFollowers.followerId, users.id))
      .where(eq(userFollowers.followingId, userId))
      .limit(limit);
    return results;
  }

  async getFollowing(userId: string, limit = 50): Promise<User[]> {
    const results = await this.db
      .select({
        id: users.id,
        countryCode: users.countryCode,
        mobileNumber: users.mobileNumber,
        isVerified: users.isVerified,
        verificationCode: users.verificationCode,
        verificationCodeExpiry: users.verificationCodeExpiry,
        latitude: users.latitude,
        longitude: users.longitude,
        displayName: users.displayName,
        bio: users.bio,
        avatarUrl: users.avatarUrl,
        isOnline: users.isOnline,
        lastSeen: users.lastSeen,
        createdAt: users.createdAt,
      })
      .from(userFollowers)
      .innerJoin(users, eq(userFollowers.followingId, users.id))
      .where(eq(userFollowers.followerId, userId))
      .limit(limit);
    return results;
  }

  async createNetworkNode(node: InsertNetworkNode): Promise<NetworkNode> {
    const results = await this.db.insert(networkNodes).values(node).returning();
    return results[0];
  }

  async updateNodeHeartbeat(nodeId: string, peerConnections: number): Promise<NetworkNode | undefined> {
    const results = await this.db.update(networkNodes)
      .set({
        lastHeartbeat: new Date(),
        peerConnections,
      })
      .where(eq(networkNodes.id, nodeId))
      .returning();
    return results[0];
  }

  async deactivateNode(nodeId: string): Promise<boolean> {
    const results = await this.db.update(networkNodes)
      .set({ isActive: 'false' })
      .where(eq(networkNodes.id, nodeId))
      .returning();
    return results.length > 0;
  }

  async getUserNodes(userId: string): Promise<NetworkNode[]> {
    return await this.db.select().from(networkNodes)
      .where(eq(networkNodes.userId, userId));
  }

  async getNetworkStats(): Promise<NetworkStats> {
    const allNodes = await this.db.select().from(networkNodes);
    const activeNodes = allNodes.filter(n => n.isActive === 'true');

    const totalNodes = allNodes.length;
    const totalActiveNodes = activeNodes.length;
    const totalPeerConnections = activeNodes.reduce((sum, n) => sum + n.peerConnections, 0);
    const avgSecurityScore = totalActiveNodes > 0
      ? activeNodes.reduce((sum, n) => sum + n.securityScore, 0) / totalActiveNodes
      : 0;

    return {
      totalNodes,
      activeNodes: totalActiveNodes,
      avgSecurityScore,
      totalPeerConnections,
    };
  }

  async getActiveNodes(limit = 100): Promise<NetworkNode[]> {
    return await this.db.select().from(networkNodes)
      .where(eq(networkNodes.isActive, 'true'))
      .orderBy(desc(networkNodes.lastHeartbeat))
      .limit(limit);
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
