import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from 'crypto';
import { ValueTransformer } from 'typeorm';

// AES-256-GCM cho access token at-rest (task 2.5, spec.md §5).
// Key dẫn xuất từ TOKEN_ENCRYPTION_KEY (env, tách khỏi SHOPIFY_API_SECRET).
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

function deriveKey(): Buffer {
  const secret = process.env.TOKEN_ENCRYPTION_KEY;
  if (!secret || secret.length < 32) {
    throw new Error('TOKEN_ENCRYPTION_KEY missing or shorter than 32 chars');
  }
  return createHash('sha256').update(secret).digest(); // luôn 32 bytes
}

export function encryptToken(plaintext: string): string {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, deriveKey(), iv);
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([iv, authTag, ciphertext]).toString('base64');
}

export function decryptToken(payload: string): string {
  const buf = Buffer.from(payload, 'base64');
  const iv = buf.subarray(0, IV_LENGTH);
  const authTag = buf.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
  const ciphertext = buf.subarray(IV_LENGTH + AUTH_TAG_LENGTH);
  const decipher = createDecipheriv(ALGORITHM, deriveKey(), iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]).toString('utf8');
}

/** TypeORM transformer: mã hóa khi ghi, giải mã khi đọc. Bỏ qua null/undefined. */
export const tokenEncryptionTransformer: ValueTransformer = {
  to: (value?: string | null): string | null | undefined =>
    value === null || value === undefined ? value : encryptToken(value),
  from: (value?: string | null): string | null | undefined =>
    value === null || value === undefined ? value : decryptToken(value),
};
