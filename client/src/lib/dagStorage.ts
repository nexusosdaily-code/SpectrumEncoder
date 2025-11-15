import { openDB, type IDBPDatabase } from 'idb';
import type { DagVertex, InsertDagVertex } from '@/../../shared/schema';
import { DAGUtils, type TipSelection } from '@/../../shared/dag';

const DB_NAME = 'nexus-dag';
const DB_VERSION = 1;
const VERTEX_STORE = 'vertices';
const CHECKPOINT_STORE = 'checkpoints';

export interface CheckpointRecord {
  id: string;
  timestamp: number;
  vertexHashes: string[];
  serverSynced: boolean;
}

export class DAGStorage {
  private db: IDBPDatabase | null = null;
  private initPromise: Promise<void> | null = null;

  async init(): Promise<void> {
    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = this._init();
    return this.initPromise;
  }

  private async _init(): Promise<void> {
    this.db = await openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(VERTEX_STORE)) {
          const vertexStore = db.createObjectStore(VERTEX_STORE, {
            keyPath: 'vertexHash',
          });
          vertexStore.createIndex('byNodeId', 'nodeId');
          vertexStore.createIndex('byDepth', 'depth');
          vertexStore.createIndex('byCreatedAt', 'createdAt');
          vertexStore.createIndex('byAnchored', 'isAnchored');
        }

        if (!db.objectStoreNames.contains(CHECKPOINT_STORE)) {
          const checkpointStore = db.createObjectStore(CHECKPOINT_STORE, {
            keyPath: 'id',
          });
          checkpointStore.createIndex('byTimestamp', 'timestamp');
          checkpointStore.createIndex('bySynced', 'serverSynced');
        }
      },
    });
  }

  async addVertex(vertex: DagVertex): Promise<void> {
    await this.init();
    if (!this.db) throw new Error('DB not initialized');

    const tx = this.db.transaction(VERTEX_STORE, 'readwrite');
    await tx.objectStore(VERTEX_STORE).put(vertex);
    await tx.done;
  }

  async getVertex(vertexHash: string): Promise<DagVertex | undefined> {
    await this.init();
    if (!this.db) throw new Error('DB not initialized');

    return await this.db.get(VERTEX_STORE, vertexHash);
  }

  async getRecentVertices(limit: number = 100): Promise<DagVertex[]> {
    await this.init();
    if (!this.db) throw new Error('DB not initialized');

    const tx = this.db.transaction(VERTEX_STORE, 'readonly');
    const index = tx.objectStore(VERTEX_STORE).index('byCreatedAt');
    
    const vertices = await index.getAll();
    
    return vertices
      .sort((a, b) => {
        const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return timeB - timeA;
      })
      .slice(0, limit);
  }

  async getTips(count: number = 10): Promise<DagVertex[]> {
    await this.init();
    if (!this.db) throw new Error('DB not initialized');

    const recent = await this.getRecentVertices(100);
    
    const unanchored = recent.filter(
      v => !v.isAnchored || v.isAnchored === 'false'
    );

    return unanchored
      .sort((a, b) => b.cumulativeWeight - a.cumulativeWeight)
      .slice(0, count);
  }

  async selectTips(): Promise<TipSelection> {
    const recentVertices = await this.getRecentVertices(50);
    return DAGUtils.selectTips(recentVertices);
  }

  async getAllVertices(): Promise<DagVertex[]> {
    await this.init();
    if (!this.db) throw new Error('DB not initialized');

    return await this.db.getAll(VERTEX_STORE);
  }

  async getVerticesByNode(nodeId: string, limit: number = 50): Promise<DagVertex[]> {
    await this.init();
    if (!this.db) throw new Error('DB not initialized');

    const tx = this.db.transaction(VERTEX_STORE, 'readonly');
    const index = tx.objectStore(VERTEX_STORE).index('byNodeId');
    
    const vertices = await index.getAll(nodeId);
    
    return vertices
      .sort((a, b) => {
        const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return timeB - timeA;
      })
      .slice(0, limit);
  }

  async pruneOldVertices(maxAgeMs: number = 7 * 24 * 60 * 60 * 1000): Promise<number> {
    await this.init();
    if (!this.db) throw new Error('DB not initialized');

    const allVertices = await this.getAllVertices();
    const pruned = DAGUtils.pruneOldVertices(allVertices, maxAgeMs);
    
    const toDelete = allVertices.filter(
      v => !pruned.some(p => p.vertexHash === v.vertexHash)
    );

    if (toDelete.length === 0) return 0;

    const tx = this.db.transaction(VERTEX_STORE, 'readwrite');
    const store = tx.objectStore(VERTEX_STORE);
    
    for (const vertex of toDelete) {
      await store.delete(vertex.vertexHash);
    }
    
    await tx.done;
    return toDelete.length;
  }

  async createCheckpoint(vertexHashes: string[]): Promise<string> {
    await this.init();
    if (!this.db) throw new Error('DB not initialized');

    const checkpoint: CheckpointRecord = {
      id: `checkpoint-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      timestamp: Date.now(),
      vertexHashes,
      serverSynced: false,
    };

    await this.db.put(CHECKPOINT_STORE, checkpoint);
    return checkpoint.id;
  }

  async getUnsyncedCheckpoints(): Promise<CheckpointRecord[]> {
    await this.init();
    if (!this.db) throw new Error('DB not initialized');

    const allCheckpoints = await this.db.getAll(CHECKPOINT_STORE);
    return allCheckpoints.filter(c => !c.serverSynced);
  }

  async markCheckpointSynced(checkpointId: string): Promise<void> {
    await this.init();
    if (!this.db) throw new Error('DB not initialized');

    const checkpoint = await this.db.get(CHECKPOINT_STORE, checkpointId);
    if (!checkpoint) return;

    checkpoint.serverSynced = true;
    await this.db.put(CHECKPOINT_STORE, checkpoint);
  }

  async updateCumulativeWeights(): Promise<void> {
    await this.init();
    if (!this.db) throw new Error('DB not initialized');

    const allVertices = await this.getAllVertices();
    const tx = this.db.transaction(VERTEX_STORE, 'readwrite');
    const store = tx.objectStore(VERTEX_STORE);

    for (const vertex of allVertices) {
      const newWeight = DAGUtils.calculateCumulativeWeight(vertex, allVertices);
      if (newWeight !== vertex.cumulativeWeight) {
        vertex.cumulativeWeight = newWeight;
        await store.put(vertex);
      }
    }

    await tx.done;
  }

  async getStats(): Promise<{
    totalVertices: number;
    anchoredVertices: number;
    maxDepth: number;
    oldestVertex: Date | null;
    newestVertex: Date | null;
  }> {
    await this.init();
    if (!this.db) throw new Error('DB not initialized');

    const allVertices = await this.getAllVertices();

    const anchored = allVertices.filter(v => v.isAnchored === 'true').length;
    const maxDepth = allVertices.length > 0 
      ? Math.max(...allVertices.map(v => v.depth))
      : 0;

    const timestamps = allVertices
      .map(v => v.createdAt ? new Date(v.createdAt).getTime() : 0)
      .filter(t => t > 0);

    return {
      totalVertices: allVertices.length,
      anchoredVertices: anchored,
      maxDepth,
      oldestVertex: timestamps.length > 0 
        ? new Date(Math.min(...timestamps))
        : null,
      newestVertex: timestamps.length > 0 
        ? new Date(Math.max(...timestamps))
        : null,
    };
  }

  async clear(): Promise<void> {
    await this.init();
    if (!this.db) throw new Error('DB not initialized');

    const tx = this.db.transaction([VERTEX_STORE, CHECKPOINT_STORE], 'readwrite');
    await tx.objectStore(VERTEX_STORE).clear();
    await tx.objectStore(CHECKPOINT_STORE).clear();
    await tx.done;
  }
}

export const dagStorage = new DAGStorage();
