/**
 * Cryptographic utilities for P2P network security
 * Uses WebCrypto API with Ed25519 for signing and verification
 */

export interface KeyPair {
  publicKey: CryptoKey;
  privateKey: CryptoKey;
  publicKeyHex: string;
}

export interface SignedData {
  data: string;
  signature: string;
  publicKey: string;
  timestamp: number;
  nonce: string;
}

/**
 * Generate a new Ed25519 key pair for peer authentication
 */
export async function generateKeyPair(): Promise<KeyPair> {
  const keyPair = await crypto.subtle.generateKey(
    {
      name: 'Ed25519',
    },
    true, // extractable
    ['sign', 'verify']
  ) as CryptoKeyPair;

  const publicKeyBuffer = await crypto.subtle.exportKey('raw', keyPair.publicKey);
  const publicKeyHex = bufferToHex(publicKeyBuffer);

  return {
    publicKey: keyPair.publicKey,
    privateKey: keyPair.privateKey,
    publicKeyHex,
  };
}

/**
 * Export a private key to hex string for storage
 */
export async function exportPrivateKey(privateKey: CryptoKey): Promise<string> {
  const keyBuffer = await crypto.subtle.exportKey('pkcs8', privateKey);
  return bufferToHex(keyBuffer);
}

/**
 * Import a private key from hex string
 */
export async function importPrivateKey(privateKeyHex: string): Promise<CryptoKey> {
  const keyBuffer = hexToBuffer(privateKeyHex);
  return await crypto.subtle.importKey(
    'pkcs8',
    keyBuffer,
    {
      name: 'Ed25519',
    },
    true,
    ['sign']
  );
}

/**
 * Import a public key from hex string
 */
export async function importPublicKey(publicKeyHex: string): Promise<CryptoKey> {
  const keyBuffer = hexToBuffer(publicKeyHex);
  return await crypto.subtle.importKey(
    'raw',
    keyBuffer,
    {
      name: 'Ed25519',
    },
    true,
    ['verify']
  );
}

/**
 * Sign data with a private key
 */
export async function signData(
  data: string,
  privateKey: CryptoKey,
  publicKeyHex: string
): Promise<SignedData> {
  const nonce = generateNonce();
  const timestamp = Date.now();
  
  const payload = JSON.stringify({
    data,
    timestamp,
    nonce,
  });

  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(payload);
  
  const signatureBuffer = await crypto.subtle.sign(
    {
      name: 'Ed25519',
    },
    privateKey,
    dataBuffer
  );

  return {
    data,
    signature: bufferToHex(signatureBuffer),
    publicKey: publicKeyHex,
    timestamp,
    nonce,
  };
}

/**
 * Verify signed data
 */
export async function verifySignature(signedData: SignedData): Promise<boolean> {
  try {
    const publicKey = await importPublicKey(signedData.publicKey);
    
    const payload = JSON.stringify({
      data: signedData.data,
      timestamp: signedData.timestamp,
      nonce: signedData.nonce,
    });

    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(payload);
    const signatureBuffer = hexToBuffer(signedData.signature);

    return await crypto.subtle.verify(
      {
        name: 'Ed25519',
      },
      publicKey,
      signatureBuffer,
      dataBuffer
    );
  } catch (error) {
    console.error('[Crypto] Signature verification failed:', error);
    return false;
  }
}

/**
 * Generate a cryptographically secure nonce
 */
export function generateNonce(): string {
  const buffer = new Uint8Array(16);
  crypto.getRandomValues(buffer);
  return bufferToHex(buffer);
}

/**
 * Convert ArrayBuffer to hex string
 */
function bufferToHex(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Convert hex string to ArrayBuffer
 */
function hexToBuffer(hex: string): ArrayBuffer {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes.buffer;
}

/**
 * Hash data using SHA-256 (for non-signature purposes like content hashing)
 */
export async function hashData(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
  return bufferToHex(hashBuffer);
}

/**
 * Replay attack prevention
 */
export class NonceTracker {
  private seenNonces: Map<string, number> = new Map();
  private readonly maxAge: number;
  private readonly cleanupInterval: number;

  constructor(maxAgeMs: number = 300000, cleanupIntervalMs: number = 60000) {
    this.maxAge = maxAgeMs;
    this.cleanupInterval = cleanupIntervalMs;
    this.startCleanup();
  }

  /**
   * Check if nonce has been seen before
   */
  hasSeenNonce(nonce: string, timestamp: number): boolean {
    if (this.seenNonces.has(nonce)) {
      return true;
    }

    // Check if timestamp is too old or in the future
    const now = Date.now();
    if (timestamp < now - this.maxAge || timestamp > now + 60000) {
      return true; // Reject old or future-dated messages
    }

    this.seenNonces.set(nonce, timestamp);
    return false;
  }

  /**
   * Cleanup old nonces periodically
   */
  private startCleanup(): void {
    setInterval(() => {
      const now = Date.now();
      const cutoff = now - this.maxAge;
      
      const entries = Array.from(this.seenNonces.entries());
      for (const [nonce, timestamp] of entries) {
        if (timestamp < cutoff) {
          this.seenNonces.delete(nonce);
        }
      }
    }, this.cleanupInterval);
  }

  /**
   * Get statistics
   */
  getStats() {
    return {
      trackedNonces: this.seenNonces.size,
      maxAge: this.maxAge,
    };
  }
}
