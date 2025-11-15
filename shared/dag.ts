import { createHash } from 'crypto';
import type { DagVertex, InsertDagVertex } from './schema';

export interface TipSelection {
  tip1Hash: string;
  tip2Hash: string;
  depth: number;
}

export interface EngagementProofData {
  nodeId: string;
  eventType: 'relay' | 'decode' | 'verify' | 'heartbeat' | 'message';
  timestamp: number;
  nonce: string;
  workFactor?: number;
}

export interface VertexPayload {
  type: 'message' | 'verification' | 'engagement';
  data: any;
  timestamp: number;
}

export class DAGUtils {
  static readonly GENESIS_HASH = '0'.repeat(64);
  
  static calculateVertexHash(vertex: {
    tipReference1: string;
    tipReference2: string;
    payloadHash: string;
    nodeId: string;
    timestamp: number;
  }): string {
    const data = JSON.stringify({
      tip1: vertex.tipReference1,
      tip2: vertex.tipReference2,
      payload: vertex.payloadHash,
      node: vertex.nodeId,
      ts: vertex.timestamp,
    });
    
    return createHash('sha256').update(data).digest('hex');
  }
  
  static calculatePayloadHash(payload: VertexPayload): string {
    const canonical = JSON.stringify(payload, Object.keys(payload).sort());
    return createHash('sha256').update(canonical).digest('hex');
  }
  
  static generateEngagementProof(data: EngagementProofData, privateKey?: string): string {
    const proof = {
      nodeId: data.nodeId,
      eventType: data.eventType,
      timestamp: data.timestamp,
      nonce: data.nonce,
      workFactor: data.workFactor || 1,
    };
    
    const proofData = JSON.stringify(proof, Object.keys(proof).sort());
    
    if (privateKey) {
      const signature = createHash('sha256')
        .update(proofData + privateKey)
        .digest('hex');
      return JSON.stringify({ ...proof, signature });
    }
    
    return JSON.stringify(proof);
  }
  
  static verifyEngagementProof(proofString: string): boolean {
    try {
      const proof = JSON.parse(proofString);
      
      if (!proof.nodeId || !proof.eventType || !proof.timestamp || !proof.nonce) {
        return false;
      }
      
      if (proof.workFactor && typeof proof.workFactor !== 'number') {
        return false;
      }
      
      const now = Date.now();
      const timeDiff = Math.abs(now - proof.timestamp);
      if (timeDiff > 5 * 60 * 1000) {
        return false;
      }
      
      return true;
    } catch {
      return false;
    }
  }
  
  static signVertex(vertexHash: string, privateKey: string): string {
    return createHash('sha256')
      .update(vertexHash + privateKey)
      .digest('hex');
  }
  
  static verifyVertexSignature(
    vertexHash: string,
    signature: string,
    publicKey: string
  ): boolean {
    const expectedSignature = createHash('sha256')
      .update(vertexHash + publicKey)
      .digest('hex');
    
    return signature === expectedSignature;
  }
  
  static selectTips(recentVertices: DagVertex[], randomSeed?: number): TipSelection {
    if (recentVertices.length === 0) {
      return {
        tip1Hash: this.GENESIS_HASH,
        tip2Hash: this.GENESIS_HASH,
        depth: 0,
      };
    }
    
    const weightedSelection = recentVertices
      .filter(v => !v.isAnchored || v.isAnchored === 'false')
      .sort((a, b) => b.cumulativeWeight - a.cumulativeWeight);
    
    if (weightedSelection.length === 0) {
      const latest = recentVertices[recentVertices.length - 1];
      return {
        tip1Hash: latest.vertexHash,
        tip2Hash: latest.vertexHash,
        depth: latest.depth + 1,
      };
    }
    
    if (weightedSelection.length === 1) {
      return {
        tip1Hash: weightedSelection[0].vertexHash,
        tip2Hash: weightedSelection[0].vertexHash,
        depth: weightedSelection[0].depth + 1,
      };
    }
    
    const seed = randomSeed || Math.random();
    const index1 = Math.floor(seed * Math.min(5, weightedSelection.length));
    let index2 = Math.floor((seed * 1000) % Math.min(5, weightedSelection.length));
    if (index2 === index1) {
      index2 = (index2 + 1) % Math.min(5, weightedSelection.length);
    }
    
    const tip1 = weightedSelection[index1];
    const tip2 = weightedSelection[index2];
    const maxDepth = Math.max(tip1.depth, tip2.depth);
    
    return {
      tip1Hash: tip1.vertexHash,
      tip2Hash: tip2.vertexHash,
      depth: maxDepth + 1,
    };
  }
  
  static calculateCumulativeWeight(
    vertex: DagVertex,
    allVertices: DagVertex[]
  ): number {
    const referenced = allVertices.filter(
      v =>
        v.tipReference1 === vertex.vertexHash ||
        v.tipReference2 === vertex.vertexHash
    );
    
    if (referenced.length === 0) {
      return 1;
    }
    
    const childWeights = referenced.map(v => v.cumulativeWeight);
    return 1 + childWeights.reduce((sum, w) => sum + w, 0);
  }
  
  static isValidDAG(vertices: DagVertex[]): boolean {
    if (vertices.length === 0) return true;
    
    const hashes = new Set(vertices.map(v => v.vertexHash));
    
    for (const vertex of vertices) {
      if (
        vertex.tipReference1 !== this.GENESIS_HASH &&
        !hashes.has(vertex.tipReference1)
      ) {
        return false;
      }
      
      if (
        vertex.tipReference2 !== this.GENESIS_HASH &&
        !hashes.has(vertex.tipReference2)
      ) {
        return false;
      }
    }
    
    const depths = new Map<string, number>();
    vertices.forEach(v => depths.set(v.vertexHash, v.depth));
    
    for (const vertex of vertices) {
      if (vertex.tipReference1 !== this.GENESIS_HASH) {
        const tip1Depth = depths.get(vertex.tipReference1) || 0;
        if (vertex.depth <= tip1Depth) {
          return false;
        }
      }
      
      if (vertex.tipReference2 !== this.GENESIS_HASH) {
        const tip2Depth = depths.get(vertex.tipReference2) || 0;
        if (vertex.depth <= tip2Depth) {
          return false;
        }
      }
    }
    
    return true;
  }
  
  static pruneOldVertices(
    vertices: DagVertex[],
    maxAge: number = 7 * 24 * 60 * 60 * 1000
  ): DagVertex[] {
    const now = Date.now();
    const cutoff = new Date(now - maxAge);
    
    return vertices.filter(v => {
      if (v.isAnchored === 'true') return true;
      
      return v.createdAt && new Date(v.createdAt) > cutoff;
    });
  }
}

export class VertexBuilder {
  private nodeId: string;
  private payload: VertexPayload;
  private tips?: TipSelection;
  
  constructor(nodeId: string) {
    this.nodeId = nodeId;
    this.payload = {
      type: 'message',
      data: {},
      timestamp: Date.now(),
    };
  }
  
  withPayload(payload: VertexPayload): this {
    this.payload = payload;
    return this;
  }
  
  withTips(tips: TipSelection): this {
    this.tips = tips;
    return this;
  }
  
  build(privateKey: string): InsertDagVertex {
    if (!this.tips) {
      throw new Error('Tips must be selected before building vertex');
    }
    
    const payloadHash = DAGUtils.calculatePayloadHash(this.payload);
    const vertexHash = DAGUtils.calculateVertexHash({
      tipReference1: this.tips.tip1Hash,
      tipReference2: this.tips.tip2Hash,
      payloadHash,
      nodeId: this.nodeId,
      timestamp: this.payload.timestamp,
    });
    
    const engagementProof = DAGUtils.generateEngagementProof(
      {
        nodeId: this.nodeId,
        eventType: this.payload.type === 'message' ? 'message' : 'verify',
        timestamp: this.payload.timestamp,
        nonce: Math.random().toString(36).substring(7),
      },
      privateKey
    );
    
    const signature = DAGUtils.signVertex(vertexHash, privateKey);
    
    return {
      vertexHash,
      nodeId: this.nodeId,
      tipReference1: this.tips.tip1Hash,
      tipReference2: this.tips.tip2Hash,
      depth: this.tips.depth,
      payloadType: this.payload.type,
      payloadHash,
      payloadData: JSON.stringify(this.payload.data),
      engagementProof,
      signature,
    };
  }
}
