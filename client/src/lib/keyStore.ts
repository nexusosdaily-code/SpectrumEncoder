/**
 * Secure key storage using IndexedDB with WebCrypto
 * Stores encrypted private keys and provides key management
 */

import { openDB, type IDBPDatabase } from 'idb';
import { generateKeyPair, exportPrivateKey, importPrivateKey, type KeyPair } from '@/../../shared/crypto';

const DB_NAME = 'nexus-keystore';
const DB_VERSION = 1;
const KEY_STORE = 'keys';

interface StoredKey {
  id: string;
  publicKeyHex: string;
  encryptedPrivateKey: string;
  createdAt: number;
}

export class KeyStore {
  private db: IDBPDatabase | null = null;
  private initPromise: Promise<void> | null = null;
  private currentKeyPair: KeyPair | null = null;

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
        if (!db.objectStoreNames.contains(KEY_STORE)) {
          const keyStore = db.createObjectStore(KEY_STORE, {
            keyPath: 'id',
          });
          keyStore.createIndex('byCreatedAt', 'createdAt');
        }
      },
    });
  }

  /**
   * Generate and store a new key pair
   */
  async generateAndStoreKeys(): Promise<KeyPair> {
    await this.init();
    if (!this.db) throw new Error('DB not initialized');

    const keyPair = await generateKeyPair();
    const privateKeyHex = await exportPrivateKey(keyPair.privateKey);

    // Simple XOR obfuscation (not cryptographically secure, but better than plaintext)
    // For production, consider using WebCrypto wrapKey/unwrapKey with a password-derived key
    const encryptedPrivateKey = this.obfuscate(privateKeyHex);

    const storedKey: StoredKey = {
      id: 'current',
      publicKeyHex: keyPair.publicKeyHex,
      encryptedPrivateKey,
      createdAt: Date.now(),
    };

    await this.db.put(KEY_STORE, storedKey);
    this.currentKeyPair = keyPair;

    return keyPair;
  }

  /**
   * Load existing keys from storage
   */
  async loadKeys(): Promise<KeyPair | null> {
    await this.init();
    if (!this.db) throw new Error('DB not initialized');

    if (this.currentKeyPair) {
      return this.currentKeyPair;
    }

    const storedKey = await this.db.get(KEY_STORE, 'current');
    if (!storedKey) {
      return null;
    }

    try {
      const privateKeyHex = this.deobfuscate(storedKey.encryptedPrivateKey);
      const privateKey = await importPrivateKey(privateKeyHex);
      
      const publicKeyBuffer = new Uint8Array(
        storedKey.publicKeyHex.match(/.{1,2}/g)!.map((byte: string) => parseInt(byte, 16))
      );
      const publicKey = await crypto.subtle.importKey(
        'raw',
        publicKeyBuffer,
        { name: 'Ed25519' },
        true,
        ['verify']
      );

      this.currentKeyPair = {
        publicKey,
        privateKey,
        publicKeyHex: storedKey.publicKeyHex,
      };

      return this.currentKeyPair;
    } catch (error) {
      console.error('[KeyStore] Failed to load keys:', error);
      return null;
    }
  }

  /**
   * Get or generate keys
   */
  async getOrGenerateKeys(): Promise<KeyPair> {
    const existing = await this.loadKeys();
    if (existing) {
      return existing;
    }

    return await this.generateAndStoreKeys();
  }

  /**
   * Export public key for sharing
   */
  async getPublicKeyHex(): Promise<string | null> {
    const keyPair = await this.loadKeys();
    return keyPair?.publicKeyHex || null;
  }

  /**
   * Clear all stored keys
   */
  async clearKeys(): Promise<void> {
    await this.init();
    if (!this.db) throw new Error('DB not initialized');

    await this.db.clear(KEY_STORE);
    this.currentKeyPair = null;
  }

  /**
   * Simple XOR obfuscation (not cryptographically secure)
   * Uses a static key derived from browser fingerprint
   * For production, use WebCrypto wrapKey/unwrapKey with password-derived key
   */
  private obfuscate(data: string): string {
    const key = this.getObfuscationKey();
    let result = '';
    
    for (let i = 0; i < data.length; i++) {
      const charCode = data.charCodeAt(i) ^ key.charCodeAt(i % key.length);
      result += String.fromCharCode(charCode);
    }
    
    return btoa(result);
  }

  /**
   * Reverse XOR obfuscation
   */
  private deobfuscate(data: string): string {
    const key = this.getObfuscationKey();
    const decodedData = atob(data);
    let result = '';
    
    for (let i = 0; i < decodedData.length; i++) {
      const charCode = decodedData.charCodeAt(i) ^ key.charCodeAt(i % key.length);
      result += String.fromCharCode(charCode);
    }
    
    return result;
  }

  /**
   * Generate obfuscation key from browser fingerprint
   */
  private getObfuscationKey(): string {
    const fingerprint = [
      navigator.userAgent,
      navigator.language,
      new Date().getTimezoneOffset().toString(),
      screen.colorDepth.toString(),
      screen.width.toString(),
      screen.height.toString(),
    ].join('|');
    
    // Simple hash
    let hash = 0;
    for (let i = 0; i < fingerprint.length; i++) {
      const char = fingerprint.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    
    return 'nexus-' + Math.abs(hash).toString(36);
  }
}

export const keyStore = new KeyStore();
