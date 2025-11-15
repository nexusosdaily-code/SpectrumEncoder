import { createLibp2p, type Libp2p } from 'libp2p';
import { noise } from '@chainsafe/libp2p-noise';
import { yamux } from '@chainsafe/libp2p-yamux';
import { gossipsub, type GossipSub } from '@libp2p/gossipsub';
import { identify } from '@libp2p/identify';
import { webSockets } from '@libp2p/websockets';
import { bootstrap } from '@libp2p/bootstrap';
import type { PeerId } from '@libp2p/interface';

export interface PeerInfo {
  peerId: string;
  multiaddrs: string[];
  connections: number;
  lastSeen: number;
}

export interface NetworkStats {
  totalPeers: number;
  activePeers: number;
  messagesSent: number;
  messagesReceived: number;
  uptime: number;
}

export class P2PBootstrapService {
  private node: Libp2p | null = null;
  private startTime: number = 0;
  private stats: NetworkStats = {
    totalPeers: 0,
    activePeers: 0,
    messagesSent: 0,
    messagesReceived: 0,
    uptime: 0,
  };
  private peers: Map<string, PeerInfo> = new Map();

  async start(): Promise<void> {
    this.startTime = Date.now();

    this.node = await createLibp2p({
      addresses: {
        listen: ['/ip4/0.0.0.0/tcp/9095/ws'],
      },
      transports: [webSockets()],
      connectionEncrypters: [noise()],
      streamMuxers: [yamux()],
      services: {
        identify: identify(),
        pubsub: gossipsub({
          allowPublishToZeroTopicPeers: true,
          emitSelf: false,
        }),
      },
    });

    this.node.addEventListener('peer:connect', (evt) => {
      const peerId = evt.detail.toString();
      console.log(`[P2P Bootstrap] Peer connected: ${peerId}`);
      
      this.peers.set(peerId, {
        peerId,
        multiaddrs: [],
        connections: 1,
        lastSeen: Date.now(),
      });
      
      this.stats.activePeers = this.peers.size;
      this.stats.totalPeers = Math.max(this.stats.totalPeers, this.peers.size);
    });

    this.node.addEventListener('peer:disconnect', (evt) => {
      const peerId = evt.detail.toString();
      console.log(`[P2P Bootstrap] Peer disconnected: ${peerId}`);
      
      this.peers.delete(peerId);
      this.stats.activePeers = this.peers.size;
    });

    const pubsub = this.node.services.pubsub as GossipSub;
    if (pubsub) {
      pubsub.addEventListener('message', (evt: any) => {
        this.stats.messagesReceived++;
        console.log(`[P2P Bootstrap] Message received on topic: ${evt.detail.topic}`);
      });
    }

    await this.node.start();
    console.log(`[P2P Bootstrap] Node started with ID: ${this.node.peerId.toString()}`);
    console.log(`[P2P Bootstrap] Listening on:`);
    this.node.getMultiaddrs().forEach(addr => {
      console.log(`  ${addr.toString()}`);
    });
  }

  async stop(): Promise<void> {
    if (this.node) {
      await this.node.stop();
      this.node = null;
      console.log('[P2P Bootstrap] Node stopped');
    }
  }

  getPeerCount(): number {
    return this.peers.size;
  }

  getPeers(): PeerInfo[] {
    return Array.from(this.peers.values());
  }

  getStats(): NetworkStats {
    return {
      ...this.stats,
      uptime: Date.now() - this.startTime,
    };
  }

  getNodeInfo() {
    if (!this.node) {
      return null;
    }

    return {
      peerId: this.node.peerId.toString(),
      multiaddrs: this.node.getMultiaddrs().map(addr => addr.toString()),
      peers: this.getPeerCount(),
    };
  }

  async publishMessage(topic: string, data: any): Promise<void> {
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
    this.stats.messagesSent++;
  }

  async subscribeTopic(topic: string, handler: (data: any) => void): Promise<void> {
    if (!this.node) {
      throw new Error('P2P node not initialized');
    }

    const pubsub = this.node.services.pubsub as GossipSub;
    if (!pubsub) {
      throw new Error('Pubsub not initialized');
    }

    pubsub.subscribe(topic);
    
    pubsub.addEventListener('message', (evt: any) => {
      if (evt.detail.topic === topic) {
        try {
          const decoder = new TextDecoder();
          const text = decoder.decode(evt.detail.data);
          const data = JSON.parse(text);
          handler(data);
        } catch (error) {
          console.error('[P2P Bootstrap] Failed to parse message:', error);
        }
      }
    });
  }
}

export const p2pBootstrap = new P2PBootstrapService();
