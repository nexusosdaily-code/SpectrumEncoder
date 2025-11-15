import { createHash } from 'crypto';
import type { DagVertex, InsertDagVertex } from './schema';
import { signData, verifySignature, generateNonce, hashData, type SignedData } from './crypto';

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
  
  static async calculatePayloadHash(payload: VertexPayload): Promise<string> {
    const canonical = JSON.stringify(payload, Object.keys(payload).sort());
    return await hashData(canonical);
  }
  
  static async generateEngagementProof(
    data: EngagementProofData,
    privateKey: CryptoKey,
    publicKeyHex: string
  ): Promise<string> {
    const proof = {
      nodeId: data.nodeId,
      eventType: data.eventType,
      timestamp: data.timestamp,
      nonce: data.nonce,
      workFactor: data.workFactor || 1,
    };
    
    const proofData = JSON.stringify(proof, Object.keys(proof).sort());
    const signedProof = await signData(proofData, privateKey, publicKeyHex);
    
    return JSON.stringify(signedProof);
  }
  
  static async verifyEngagementProof(proofString: string): Promise<boolean> {
    try {
      const signedProof: SignedData = JSON.parse(proofString);
      
      if (!await verifySignature(signedProof)) {
        return false;
      }
      
      const proof = JSON.parse(signedProof.data);
      
      if (!proof.nodeId || !proof.eventType || !proof.timestamp || !proof.nonce) {
        return false;
      }
      
      if (proof.workFactor && typeof proof.workFactor !== 'number') {
        return false;
      }
      
      const now = Date.now();
      const timeDiff = Math.abs(now - signedProof.timestamp);
      if (timeDiff > 5 * 60 * 1000) {
        return false;
      }
      
      return true;
    } catch {
      return false;
    }
  }
  
  static async signVertex(
    vertexHash: string,
    privateKey: CryptoKey,
    publicKeyHex: string
  ): Promise<string> {
    const signedData = await signData(vertexHash, privateKey, publicKeyHex);
    return JSON.stringify(signedData);
  }
  
  /**
   * Verify vertex signature and ensure it matches the expected hash
   * @param signatureString - The JSON-encoded SignedData
   * @param expectedHash - The hash that should have been signed
   */
  static async verifyVertexSignature(signatureString: string, expectedHash?: string): Promise<boolean> {
    try {
      const signedData: SignedData = JSON.parse(signatureString);
      
      // Verify the cryptographic signature
      const signatureValid = await verifySignature(signedData);
      if (!signatureValid) {
        return false;
      }
      
      // If expected hash provided, verify it matches what was signed
      if (expectedHash !== undefined && signedData.data !== expectedHash) {
        console.error('[DAG] Signature valid but hash mismatch:', {
          expected: expectedHash,
          signed: signedData.data,
        });
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('[DAG] Signature verification error:', error);
      return false;
    }
  }
  
  /**
   * Select tips using weighted random walk (IOTA Tangle MCMC algorithm)
   * Performs two independent random walks to select two different tips
   */
  static selectTips(recentVertices: DagVertex[], randomSeed?: number): TipSelection {
    if (recentVertices.length === 0) {
      return {
        tip1Hash: this.GENESIS_HASH,
        tip2Hash: this.GENESIS_HASH,
        depth: 0,
      };
    }
    
    const unanchored = recentVertices.filter(v => !v.isAnchored || v.isAnchored === 'false');
    
    if (unanchored.length === 0) {
      const latest = recentVertices[recentVertices.length - 1];
      return {
        tip1Hash: latest.vertexHash,
        tip2Hash: latest.vertexHash,
        depth: latest.depth + 1,
      };
    }
    
    if (unanchored.length === 1) {
      return {
        tip1Hash: unanchored[0].vertexHash,
        tip2Hash: unanchored[0].vertexHash,
        depth: unanchored[0].depth + 1,
      };
    }
    
    // Build index for fast lookups
    const vertexMap = new Map<string, DagVertex>();
    const approvers = new Map<string, DagVertex[]>();
    
    for (const v of unanchored) {
      vertexMap.set(v.vertexHash, v);
      
      // Track which vertices approve (reference) this one
      if (!approvers.has(v.tipReference1)) {
        approvers.set(v.tipReference1, []);
      }
      approvers.get(v.tipReference1)!.push(v);
      
      if (!approvers.has(v.tipReference2)) {
        approvers.set(v.tipReference2, []);
      }
      approvers.get(v.tipReference2)!.push(v);
    }
    
    // Perform two independent random walks
    const tip1 = this.performRandomWalk(unanchored, vertexMap, approvers, randomSeed);
    const tip2 = this.performRandomWalk(unanchored, vertexMap, approvers, randomSeed ? randomSeed * 1.618 : undefined);
    
    const maxDepth = Math.max(tip1.depth, tip2.depth);
    
    return {
      tip1Hash: tip1.vertexHash,
      tip2Hash: tip2.vertexHash,
      depth: maxDepth + 1,
    };
  }
  
  /**
   * Perform a single weighted random walk from entry point to tip
   */
  private static performRandomWalk(
    vertices: DagVertex[],
    vertexMap: Map<string, DagVertex>,
    approvers: Map<string, DagVertex[]>,
    randomSeed?: number
  ): DagVertex {
    const alpha = 0.001; // Weight parameter for random walk
    const rng = randomSeed !== undefined ? this.seededRandom(randomSeed) : Math.random;
    
    // Start from a random entry point (prefer recent vertices)
    const entryIndex = Math.floor(rng() * Math.min(10, vertices.length));
    let current = vertices[vertices.length - 1 - entryIndex];
    
    // Walk until we find a tip (vertex with no approvers)
    const maxSteps = 100;
    let steps = 0;
    
    while (steps < maxSteps) {
      const currentApprovers = approvers.get(current.vertexHash) || [];
      
      // Filter out approvers that reference vertices not in our current set
      const validApprovers = currentApprovers.filter(approver => {
        const tip1Exists = approver.tipReference1 === this.GENESIS_HASH || vertexMap.has(approver.tipReference1);
        const tip2Exists = approver.tipReference2 === this.GENESIS_HASH || vertexMap.has(approver.tipReference2);
        return tip1Exists && tip2Exists;
      });
      
      // If no valid approvers, we've found a tip
      if (validApprovers.length === 0) {
        return current;
      }
      
      // Weighted random selection of next vertex
      // Higher cumulative weight = higher probability
      const totalWeight = validApprovers.reduce((sum, v) => {
        const weight = v.cumulativeWeight > 0 ? v.cumulativeWeight : 1;
        return sum + Math.exp(alpha * weight);
      }, 0);
      
      if (totalWeight === 0) {
        // Fallback to uniform random if all weights are zero
        const randomIndex = Math.floor(rng() * validApprovers.length);
        current = validApprovers[randomIndex];
      } else {
        let random = rng() * totalWeight;
        
        let next = validApprovers[0];
        for (const approver of validApprovers) {
          const weight = approver.cumulativeWeight > 0 ? approver.cumulativeWeight : 1;
          const weightedValue = Math.exp(alpha * weight);
          random -= weightedValue;
          if (random <= 0) {
            next = approver;
            break;
          }
        }
        
        current = next;
      }
      
      steps++;
    }
    
    // Fallback: return current position if max steps exceeded
    return current;
  }
  
  /**
   * Seeded random number generator for reproducibility
   */
  private static seededRandom(seed: number): () => number {
    let state = seed;
    return () => {
      state = (state * 9301 + 49297) % 233280;
      return state / 233280;
    };
  }
  
  /**
   * Calculate cumulative weight for a single vertex efficiently
   * Uses pre-built index to avoid O(n²) lookups
   */
  static calculateCumulativeWeight(
    vertex: DagVertex,
    approversIndex: Map<string, DagVertex[]>
  ): number {
    const directApprovers = approversIndex.get(vertex.vertexHash) || [];
    
    if (directApprovers.length === 0) {
      return 1; // Base weight for tips
    }
    
    const childWeights = directApprovers.map(v => v.cumulativeWeight);
    return 1 + childWeights.reduce((sum, w) => sum + w, 0);
  }
  
  /**
   * Recalculate cumulative weights for all vertices efficiently
   * Uses topological ordering to compute weights in O(n) time
   */
  static recalculateAllWeights(vertices: DagVertex[]): Map<string, number> {
    const weights = new Map<string, number>();
    const approvers = new Map<string, DagVertex[]>();
    
    // Build approvers index
    for (const v of vertices) {
      if (!approvers.has(v.tipReference1)) {
        approvers.set(v.tipReference1, []);
      }
      approvers.get(v.tipReference1)!.push(v);
      
      if (!approvers.has(v.tipReference2)) {
        approvers.set(v.tipReference2, []);
      }
      approvers.get(v.tipReference2)!.push(v);
    }
    
    // Process vertices in reverse topological order (newest first)
    // This ensures we calculate child weights before parent weights
    const sorted = [...vertices].sort((a, b) => b.depth - a.depth);
    
    for (const vertex of sorted) {
      const directApprovers = approvers.get(vertex.vertexHash) || [];
      
      if (directApprovers.length === 0) {
        weights.set(vertex.vertexHash, 1);
      } else {
        const childWeights = directApprovers.map(v => weights.get(v.vertexHash) || 1);
        weights.set(vertex.vertexHash, 1 + childWeights.reduce((sum, w) => sum + w, 0));
      }
    }
    
    return weights;
  }
  
  /**
   * Detect cycles in the DAG using depth-first search
   */
  private static hasCycles(vertices: DagVertex[]): boolean {
    const vertexMap = new Map<string, DagVertex>();
    vertices.forEach(v => vertexMap.set(v.vertexHash, v));
    
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    
    const dfs = (hash: string): boolean => {
      if (recursionStack.has(hash)) {
        return true; // Cycle detected
      }
      
      if (visited.has(hash)) {
        return false; // Already processed
      }
      
      visited.add(hash);
      recursionStack.add(hash);
      
      const vertex = vertexMap.get(hash);
      if (vertex) {
        if (vertex.tipReference1 !== this.GENESIS_HASH) {
          if (dfs(vertex.tipReference1)) return true;
        }
        if (vertex.tipReference2 !== this.GENESIS_HASH) {
          if (dfs(vertex.tipReference2)) return true;
        }
      }
      
      recursionStack.delete(hash);
      return false;
    };
    
    for (const vertex of vertices) {
      if (!visited.has(vertex.vertexHash)) {
        if (dfs(vertex.vertexHash)) {
          return true;
        }
      }
    }
    
    return false;
  }
  
  /**
   * Validate DAG structure with comprehensive checks
   * - All referenced tips exist (except genesis)
   * - No cycles in the reference graph
   * - No conflicting references (same payload approved by different vertices)
   * - Proper depth ordering
   * - Valid anchoring rules
   */
  static isValidDAG(vertices: DagVertex[]): boolean {
    if (vertices.length === 0) return true;
    
    // Check for cycles first
    if (this.hasCycles(vertices)) {
      console.error('[DAG Validation] Cycle detected in DAG');
      return false;
    }
    
    const hashes = new Set(vertices.map(v => v.vertexHash));
    const payloadMap = new Map<string, string[]>(); // payloadHash -> vertexHashes
    
    // Check 1: All references exist
    for (const vertex of vertices) {
      if (
        vertex.tipReference1 !== this.GENESIS_HASH &&
        !hashes.has(vertex.tipReference1)
      ) {
        console.error(`[DAG Validation] Missing tip reference: ${vertex.tipReference1}`);
        return false;
      }
      
      if (
        vertex.tipReference2 !== this.GENESIS_HASH &&
        !hashes.has(vertex.tipReference2)
      ) {
        console.error(`[DAG Validation] Missing tip reference: ${vertex.tipReference2}`);
        return false;
      }
      
      // Track vertices by payload for conflict detection
      const existing = payloadMap.get(vertex.payloadHash) || [];
      existing.push(vertex.vertexHash);
      payloadMap.set(vertex.payloadHash, existing);
    }
    
    // Check 2: No conflicting approvals (different vertices approving same payload with different tips)
    for (const [payloadHash, vertexHashes] of Array.from(payloadMap.entries())) {
      if (vertexHashes.length > 1) {
        const tipSets = new Set<string>();
        for (const vHash of vertexHashes) {
          const v = vertices.find(vertex => vertex.vertexHash === vHash);
          if (v) {
            tipSets.add(`${v.tipReference1},${v.tipReference2}`);
          }
        }
        if (tipSets.size > 1) {
          console.error(`[DAG Validation] Conflicting approvals for payload: ${payloadHash}`);
          return false;
        }
      }
    }
    
    const depths = new Map<string, number>();
    const anchoredStatus = new Map<string, boolean>();
    
    vertices.forEach(v => {
      depths.set(v.vertexHash, v.depth);
      anchoredStatus.set(v.vertexHash, v.isAnchored === 'true');
    });
    
    // Check 3: Depth ordering (children must have greater depth than parents)
    for (const vertex of vertices) {
      if (vertex.tipReference1 !== this.GENESIS_HASH) {
        const tip1Depth = depths.get(vertex.tipReference1) || 0;
        if (vertex.depth <= tip1Depth) {
          console.error(`[DAG Validation] Invalid depth for vertex ${vertex.vertexHash}`);
          return false;
        }
      }
      
      if (vertex.tipReference2 !== this.GENESIS_HASH) {
        const tip2Depth = depths.get(vertex.tipReference2) || 0;
        if (vertex.depth <= tip2Depth) {
          console.error(`[DAG Validation] Invalid depth for vertex ${vertex.vertexHash}`);
          return false;
        }
      }
    }
    
    // Check 4: Anchoring rules
    // - Anchored vertices must have anchored or genesis parents
    // - Anchor timestamp must be after creation
    for (const vertex of vertices) {
      if (vertex.isAnchored === 'true') {
        if (vertex.anchorTimestamp && vertex.createdAt) {
          const anchorTime = new Date(vertex.anchorTimestamp).getTime();
          const createTime = new Date(vertex.createdAt).getTime();
          
          if (anchorTime < createTime) {
            console.error(`[DAG Validation] Anchor timestamp before creation for ${vertex.vertexHash}`);
            return false;
          }
        }
        
        // Parents must be anchored (or genesis)
        if (vertex.tipReference1 !== this.GENESIS_HASH) {
          const tip1Anchored = anchoredStatus.get(vertex.tipReference1);
          if (tip1Anchored === false) {
            console.error(`[DAG Validation] Anchored vertex has unanchored parent: ${vertex.vertexHash}`);
            return false;
          }
        }
        
        if (vertex.tipReference2 !== this.GENESIS_HASH) {
          const tip2Anchored = anchoredStatus.get(vertex.tipReference2);
          if (tip2Anchored === false) {
            console.error(`[DAG Validation] Anchored vertex has unanchored parent: ${vertex.vertexHash}`);
            return false;
          }
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
  
  async build(privateKey: CryptoKey, publicKeyHex: string): Promise<InsertDagVertex> {
    if (!this.tips) {
      throw new Error('Tips must be selected before building vertex');
    }
    
    const payloadHash = await DAGUtils.calculatePayloadHash(this.payload);
    const vertexHash = DAGUtils.calculateVertexHash({
      tipReference1: this.tips.tip1Hash,
      tipReference2: this.tips.tip2Hash,
      payloadHash,
      nodeId: this.nodeId,
      timestamp: this.payload.timestamp,
    });
    
    const engagementProof = await DAGUtils.generateEngagementProof(
      {
        nodeId: this.nodeId,
        eventType: this.payload.type === 'message' ? 'message' : 'verify',
        timestamp: this.payload.timestamp,
        nonce: generateNonce(),
      },
      privateKey,
      publicKeyHex
    );
    
    const signature = await DAGUtils.signVertex(vertexHash, privateKey, publicKeyHex);
    
    return {
      vertexHash,
      nodeId: this.nodeId,
      tipReference1: this.tips.tip1Hash,
      tipReference2: this.tips.tip2Hash,
      depth: this.tips.depth,
      payloadType: this.payload.type,
      payloadHash,
      payloadData: JSON.stringify(this.payload), // Store FULL payload including timestamp
      engagementProof,
      signature,
    };
  }
}
