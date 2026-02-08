import { randomBytes, createCipheriv, createDecipheriv } from 'crypto';

/**
 * Encrypted token structure
 */
export interface EncryptedToken {
  ciphertext: string;
  iv: string;
  authTag: string;
  algorithm: 'aes-256-gcm';
}

/**
 * TokenEncryptionService
 * 
 * Provides AES-256-GCM encryption/decryption for WABA access tokens.
 * Uses unique initialization vectors (IV) for each encryption operation.
 */
export class TokenEncryptionService {
  private readonly algorithm = 'aes-256-gcm';
  private readonly keyLength = 32; // 256 bits
  private readonly ivLength = 16; // 128 bits
  private readonly authTagLength = 16; // 128 bits
  private readonly encryptionKey: Buffer;

  constructor(encryptionKey?: string) {
    const key = encryptionKey || process.env.WABA_TOKEN_ENCRYPTION_KEY;
    
    if (!key) {
      throw new Error('WABA_TOKEN_ENCRYPTION_KEY environment variable is required');
    }

    // Decode base64 key or use raw key
    try {
      this.encryptionKey = Buffer.from(key, 'base64');
    } catch {
      this.encryptionKey = Buffer.from(key, 'utf-8');
    }

    if (this.encryptionKey.length !== this.keyLength) {
      throw new Error(`Encryption key must be ${this.keyLength} bytes (256 bits)`);
    }
  }

  /**
   * Encrypt a token using AES-256-GCM
   * 
   * @param token - The plaintext token to encrypt
   * @returns EncryptedToken object containing ciphertext, IV, and auth tag
   */
  encrypt(token: string): EncryptedToken {
    if (!token || typeof token !== 'string') {
      throw new Error('Token must be a non-empty string');
    }

    try {
      // Generate unique IV for this encryption
      const iv = randomBytes(this.ivLength);

      // Create cipher
      const cipher = createCipheriv(this.algorithm, this.encryptionKey, iv);

      // Encrypt the token
      let ciphertext = cipher.update(token, 'utf8', 'base64');
      ciphertext += cipher.final('base64');

      // Get authentication tag
      const authTag = cipher.getAuthTag();

      return {
        ciphertext,
        iv: iv.toString('base64'),
        authTag: authTag.toString('base64'),
        algorithm: this.algorithm,
      };
    } catch (error) {
      throw new Error(`Encryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Decrypt a token using AES-256-GCM
   * 
   * @param encryptedToken - The encrypted token object
   * @returns The decrypted plaintext token
   */
  decrypt(encryptedToken: EncryptedToken): string {
    if (!encryptedToken || typeof encryptedToken !== 'object') {
      throw new Error('Invalid encrypted token object');
    }

    const { ciphertext, iv, authTag, algorithm } = encryptedToken;

    if (!ciphertext || !iv || !authTag) {
      throw new Error('Encrypted token must contain ciphertext, iv, and authTag');
    }

    if (algorithm !== this.algorithm) {
      throw new Error(`Unsupported algorithm: ${algorithm}`);
    }

    try {
      // Convert base64 strings to buffers
      const ivBuffer = Buffer.from(iv, 'base64');
      const authTagBuffer = Buffer.from(authTag, 'base64');

      // Create decipher
      const decipher = createDecipheriv(this.algorithm, this.encryptionKey, ivBuffer);
      decipher.setAuthTag(authTagBuffer);

      // Decrypt the token
      let plaintext = decipher.update(ciphertext, 'base64', 'utf8');
      plaintext += decipher.final('utf8');

      return plaintext;
    } catch (error) {
      // Auth tag verification failure or other decryption errors
      throw new Error(`Decryption failed: ${error instanceof Error ? error.message : 'Invalid ciphertext or auth tag'}`);
    }
  }

  /**
   * Generate a new encryption key (for key rotation)
   * 
   * @returns Base64-encoded encryption key
   */
  static generateKey(): string {
    const key = randomBytes(32); // 256 bits
    return key.toString('base64');
  }
}

// Export singleton instance
export const tokenEncryption = new TokenEncryptionService();
