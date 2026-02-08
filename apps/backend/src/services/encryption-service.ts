import { randomBytes, createCipheriv, createDecipheriv } from 'crypto';

/**
 * Encrypted data structure
 */
export interface EncryptedData {
  ciphertext: string;
  iv: string;
  authTag: string;
  algorithm: 'aes-256-gcm';
}

/**
 * EncryptionService
 * 
 * Provides AES-256-GCM encryption/decryption for sensitive settings.
 * Uses unique initialization vectors (IV) for each encryption operation.
 * Includes masking functionality for displaying sensitive values.
 */
export class EncryptionService {
  private readonly algorithm = 'aes-256-gcm';
  private readonly keyLength = 32; // 256 bits
  private readonly ivLength = 16; // 128 bits
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
   * Encrypt a value using AES-256-GCM
   * 
   * @param value - The plaintext value to encrypt
   * @returns EncryptedData object containing ciphertext, IV, and auth tag
   */
  encrypt(value: string): EncryptedData {
    if (!value || typeof value !== 'string') {
      throw new Error('Value must be a non-empty string');
    }

    try {
      // Generate unique IV for this encryption
      const iv = randomBytes(this.ivLength);

      // Create cipher
      const cipher = createCipheriv(this.algorithm, this.encryptionKey, iv);

      // Encrypt the value
      let ciphertext = cipher.update(value, 'utf8', 'base64');
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
   * Decrypt a value using AES-256-GCM
   * 
   * @param encryptedData - The encrypted data object
   * @returns The decrypted plaintext value
   */
  decrypt(encryptedData: EncryptedData): string {
    if (!encryptedData || typeof encryptedData !== 'object') {
      throw new Error('Invalid encrypted data object');
    }

    const { ciphertext, iv, authTag, algorithm } = encryptedData;

    if (!ciphertext || !iv || !authTag) {
      throw new Error('Encrypted data must contain ciphertext, iv, and authTag');
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

      // Decrypt the value
      let plaintext = decipher.update(ciphertext, 'base64', 'utf8');
      plaintext += decipher.final('utf8');

      return plaintext;
    } catch (error) {
      throw new Error(`Decryption failed: ${error instanceof Error ? error.message : 'Invalid ciphertext or auth tag'}`);
    }
  }

  /**
   * Encrypt a value and return as a single JSON string for storage
   * 
   * @param value - The plaintext value to encrypt
   * @returns JSON string containing encrypted data
   */
  encryptToString(value: string): string {
    const encrypted = this.encrypt(value);
    return JSON.stringify(encrypted);
  }

  /**
   * Decrypt a value from a JSON string
   * 
   * @param encryptedString - JSON string containing encrypted data
   * @returns The decrypted plaintext value
   */
  decryptFromString(encryptedString: string): string {
    try {
      const encryptedData = JSON.parse(encryptedString) as EncryptedData;
      return this.decrypt(encryptedData);
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new Error('Invalid encrypted string format');
      }
      throw error;
    }
  }

  /**
   * Mask a sensitive value, showing only the last 4 characters
   * 
   * @param value - The value to mask
   * @param visibleChars - Number of characters to show at the end (default: 4)
   * @returns Masked string with asterisks and visible suffix
   */
  mask(value: string, visibleChars: number = 4): string {
    if (!value || typeof value !== 'string') {
      return '****';
    }

    if (value.length <= visibleChars) {
      return '*'.repeat(value.length);
    }

    const maskedLength = value.length - visibleChars;
    const masked = '*'.repeat(Math.min(maskedLength, 20)); // Cap asterisks at 20
    const visible = value.slice(-visibleChars);

    return `${masked}${visible}`;
  }

  /**
   * Check if a string appears to be encrypted (JSON with expected fields)
   * 
   * @param value - The string to check
   * @returns True if the string appears to be encrypted data
   */
  isEncrypted(value: string): boolean {
    try {
      const parsed = JSON.parse(value);
      return (
        parsed &&
        typeof parsed === 'object' &&
        'ciphertext' in parsed &&
        'iv' in parsed &&
        'authTag' in parsed &&
        parsed.algorithm === 'aes-256-gcm'
      );
    } catch {
      return false;
    }
  }

  /**
   * Generate a new encryption key
   * 
   * @returns Base64-encoded 256-bit encryption key
   */
  static generateKey(): string {
    const key = randomBytes(32);
    return key.toString('base64');
  }
}

// Export singleton instance
export const encryptionService = new EncryptionService();
