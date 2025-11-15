import { createLibp2p, type Libp2p } from 'libp2p';
import { noise } from '@chainsafe/libp2p-noise';
import { yamux } from '@chainsafe/libp2p-yamux';
import { webRTC } from '@libp2p/webrtc';
import { webSockets } from '@libp2p/websockets';
import { gossipsub, type GossipSub } from '@libp2p/gossipsub';
import { identify } from '@libp2p/identify';
import { bootstrap } from '@libp2p/bootstrap';
import { dagStorage } from './dagStorage';
import { DAGUtils, VertexBuilder, type VertexPayload } from '@/../../shared/dag';
import type { DagVertex, NetworkNode } from '@/../../shared/schema';
import { type KeyPair, NonceTracker } from '@/../../shared/crypto';
import { keyStore } from './keyStore';

export interface P2PConfig {
  bootstrapPeers: string[];
  topics: string[];
  nodeId: string;
  keyPair: KeyPair;
}

export interface PeerStats {
  peerId: string;
  connected: boolean;
  messagesSent: number;
  messagesReceived: number;
  lastSeen: Date | null;
}

export type P2PMessageHandler = (message: any, from: string) => void;

export class P2PNetwork {
  private node: Libp2p | null = null;
  private config: P2PConfig | null = null;
  private messageHandlers: Map<string, P2PMessageHandler[]> = new Map();
  private stats: Map<string, PeerStats> = new Map();
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private nonceTracker: NonceTracker = new NonceTracker();

  async init(config: P2PConfig): Promise<void> {
    this.config = config;

    const bootstrapList = config.bootstrapPeers.length > 0
      ? config.bootstrapPeers
      : [`/ip4/127.0.0.1/tcp/9095/ws`];

    this.node = await createLibp2p({
      addresses: {
        listen: ['/webrtc'],
      },
      transports: [
        webRTC(),
        webSockets(),
      ],
      connectionEncrypters: [noise()],
      streamMuxers: [yamux()],
      services: {
        identify: identify(),
        pubsub: gossipsub({
          allowPublishToZeroTopicPeers: true,
          emitSelf: false,
          canRelayMessage: true,
        }),
      },
      peerDiscovery: [
        bootstrap({
          list: bootstrapList,
        }),
      ],
    });

    this.node.addEventListener('peer:connect', (evt) => {
      const peerId = evt.detail.toString();
      console.log(`[P2P] Connected to peer: ${peerId}`);
      
      const existing = this.stats.get(peerId);
      this.stats.set(peerId, {
        peerId,
        connected: true,
        messagesSent: existing?.messagesSent || 0,
        messagesReceived: existing?.messagesReceived || 0,
        lastSeen: new Date(),
      });
    });

    this.node.addEventListener('peer:disconnect', (evt) => {
      const peerId = evt.detail.toString();
      console.log(`[P2P] Disconnected from peer: ${peerId}`);
      
      const existing = this.stats.get(peerId);
      if (existing) {
        existing.connected = false;
        this.stats.set(peerId, existing);
      }
    });

    const pubsub = this.node.services.pubsub as GossipSub;
    if (pubsub) {
      pubsub.addEventListener('message', (evt: any) => {
        this.handleIncomingMessage(evt.detail);
      });
    }

    await this.node.start();
    console.log(`[P2P] Node started with ID: ${this.node.peerId.toString()}`);

    for (const topic of config.topics) {
      await this.subscribeTopic(topic);
    }

    this.startHeartbeat();
  }

  async stop(): Promise<void> {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    if (this.node) {
      await this.node.stop();
      this.node = null;
      console.log('[P2P] Node stopped');
    }
  }

  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(async () => {
      if (!this.config) return;

      try {
        const heartbeatVertex = await this.createEngagementVertex({
          type: 'engagement',
          data: {
            eventType: 'heartbeat',
            timestamp: Date.now(),
            peersConnected: this.getPeerCount(),
          },
          timestamp: Date.now(),
        });

        await dagStorage.addVertex(heartbeatVertex as DagVertex);
        await this.publishToTopic('nexus-heartbeat', {
          type: 'heartbeat',
          nodeId: this.config.nodeId,
          timestamp: Date.now(),
        });
      } catch (error) {
        console.error('[P2P] Heartbeat failed:', error);
      }
    }, 60000);
  }

  async subscribeTopic(topic: string): Promise<void> {
    if (!this.node) {
      throw new Error('P2P node not initialized');
    }

    const pubsub = this.node.services.pubsub as GossipSub;
    if (!pubsub) {
      throw new Error('Pubsub not initialized');
    }

    pubsub.subscribe(topic);
    console.log(`[P2P] Subscribed to topic: ${topic}`);
  }

  async publishToTopic(topic: string, data: any): Promise<void> {
    if (!this.node) {
      throw new Error('P2P node not initialized');
    }

    const pubsub = this.node.services.pubsub as GossipSub;
    if (!pubsub) {
      throw new Error('Pubsub not initialized');
    }

    const encoder = new TextEncoder();
    const message = encoder.encode(JSON.stringify(data));
    
    await pubsub.publish(topic, message);

    const selfPeerId = this.node.peerId.toString();
    const selfStats = this.stats.get(selfPeerId) || {
      peerId: selfPeerId,
      connected: true,
      messagesSent: 0,
      messagesReceived: 0,
      lastSeen: new Date(),
    };
    
    selfStats.messagesSent++;
    this.stats.set(selfPeerId, selfStats);
  }

  onMessage(topic: string, handler: P2PMessageHandler): void {
    const handlers = this.messageHandlers.get(topic) || [];
    handlers.push(handler);
    this.messageHandlers.set(topic, handlers);
  }

  private async handleIncomingMessage(message: any): Promise<void> {
    try {
      const decoder = new TextDecoder();
      const text = decoder.decode(message.data);
      const data = JSON.parse(text);
      
      const fromPeerId = message.from?.toString() || 'unknown';
      
      // Verify vertex signature if present
      if (data.type === 'relay' || data.type === 'verification') {
        const vertex = data.vertex as DagVertex;
        
        // Verify engagement proof with nonce tracking
        if (vertex.engagementProof) {
          const isValid = await DAGUtils.verifyEngagementProof(vertex.engagementProof);
          if (!isValid) {
            console.warn('[P2P] Invalid engagement proof from peer:', fromPeerId);
            return;
          }
          
          // Check for replay attacks
          try {
            const proofData = JSON.parse(vertex.engagementProof);
            if (this.nonceTracker.hasSeenNonce(proofData.nonce, proofData.timestamp)) {
              console.warn('[P2P] Replay attack detected from peer:', fromPeerId);
              return;
            }
          } catch (error) {
            console.error('[P2P] Failed to parse engagement proof for replay check:', error);
            return;
          }
        }
        
        // Verify vertex signature AND hash integrity
        if (vertex.signature) {
          // Verify payload integrity first
          if (!vertex.payloadData) {
            console.warn('[P2P] Missing payload data from peer:', fromPeerId);
            return;
          }
          
          let payload: VertexPayload;
          try {
            payload = JSON.parse(vertex.payloadData);
          } catch (error) {
            console.error('[P2P] Failed to parse payload data:', error);
            return;
          }
          
          // Recompute payload hash and verify it matches
          const computedPayloadHash = await DAGUtils.calculatePayloadHash(payload);
          if (computedPayloadHash !== vertex.payloadHash) {
            console.warn('[P2P] Payload hash mismatch - payload tampering detected from peer:', fromPeerId);
            return;
          }
          
          // Recalculate the vertex hash using the payload timestamp
          const computedVertexHash = DAGUtils.calculateVertexHash({
            tipReference1: vertex.tipReference1,
            tipReference2: vertex.tipReference2,
            payloadHash: vertex.payloadHash,
            nodeId: vertex.nodeId,
            timestamp: payload.timestamp,
          });
          
          // Verify signature AND that it signed the correct hash
          const signatureValid = await DAGUtils.verifyVertexSignature(vertex.signature, computedVertexHash);
          if (!signatureValid) {
            console.warn('[P2P] Invalid vertex signature or hash mismatch from peer:', fromPeerId);
            return;
          }
          
          // Verify claimed vertex hash matches what we computed
          if (vertex.vertexHash !== computedVertexHash) {
            console.warn('[P2P] Vertex hash mismatch from peer:', fromPeerId);
            return;
          }
        }
      }
      
      const stats = this.stats.get(fromPeerId) || {
        peerId: fromPeerId,
        connected: true,
        messagesSent: 0,
        messagesReceived: 0,
        lastSeen: null,
      };
      
      stats.messagesReceived++;
      stats.lastSeen = new Date();
      this.stats.set(fromPeerId, stats);

      const handlers = this.messageHandlers.get(message.topic);
      if (handlers) {
        for (const handler of handlers) {
          try {
            handler(data, fromPeerId);
          } catch (error) {
            console.error('[P2P] Message handler error:', error);
          }
        }
      }
    } catch (error) {
      console.error('[P2P] Failed to parse incoming message:', error);
    }
  }

  async createEngagementVertex(payload: VertexPayload): Promise<DagVertex> {
    if (!this.config) {
      throw new Error('P2P network not initialized');
    }

    const tips = await dagStorage.selectTips();
    
    const builder = new VertexBuilder(this.config.nodeId);
    const insertVertex = await builder
      .withPayload(payload)
      .withTips(tips)
      .build(this.config.keyPair.privateKey, this.config.keyPair.publicKeyHex);

    const vertex: DagVertex = {
      ...insertVertex,
      id: `vertex-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      depth: insertVertex.depth || 0,
      cumulativeWeight: 1,
      isAnchored: 'false',
      anchorTimestamp: null,
      payloadData: insertVertex.payloadData || null,
      workProof: insertVertex.workProof || null,
      createdAt: new Date(),
    };

    return vertex;
  }
  
  /**
   * Generate or load cryptographic keys for the P2P node using secure storage
   */
  static async generateKeys(): Promise<KeyPair> {
    return await keyStore.getOrGenerateKeys();
  }
  
  /**
   * Get nonce tracker statistics
   */
  getNonceTrackerStats() {
    return this.nonceTracker.getStats();
  }

  async relayMessage(messageData: any): Promise<DagVertex> {
    const vertex = await this.createEngagementVertex({
      type: 'message',
      data: messageData,
      timestamp: Date.now(),
    });

    await dagStorage.addVertex(vertex);
    
    await this.publishToTopic('nexus-messages', {
      type: 'relay',
      vertex: vertex,
      timestamp: Date.now(),
    });

    return vertex;
  }

  async verifyMessage(vertexHash: string, isValid: boolean): Promise<DagVertex> {
    const verificationVertex = await this.createEngagementVertex({
      type: 'verification',
      data: {
        targetVertexHash: vertexHash,
        isValid,
        timestamp: Date.now(),
      },
      timestamp: Date.now(),
    });

    await dagStorage.addVertex(verificationVertex);
    
    await this.publishToTopic('nexus-verifications', {
      type: 'verification',
      vertex: verificationVertex,
      timestamp: Date.now(),
    });

    return verificationVertex;
  }

  getPeerCount(): number {
    return Array.from(this.stats.values()).filter(s => s.connected).length;
  }

  getPeers(): PeerStats[] {
    return Array.from(this.stats.values());
  }

  getNodeInfo() {
    if (!this.node) {
      return null;
    }

    return {
      peerId: this.node.peerId.toString(),
      multiaddrs: this.node.getMultiaddrs().map(addr => addr.toString()),
      connections: this.getPeerCount(),
    };
  }

  getStats() {
    const peers = Array.from(this.stats.values());
    return {
      totalPeers: peers.length,
      connectedPeers: peers.filter(p => p.connected).length,
      totalMessagesSent: peers.reduce((sum, p) => sum + p.messagesSent, 0),
      totalMessagesReceived: peers.reduce((sum, p) => sum + p.messagesReceived, 0),
    };
  }
}

export const p2pNetwork = new P2PNetwork();
