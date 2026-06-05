import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

const ALGORITHM = 'aes-256-cbc';
const PREFIX = 'encrypted:';

function getOrGenerateKey(): Buffer {
  const envPath = path.join(process.cwd(), '.env');
  
  // Create .env if not exists
  if (!fs.existsSync(envPath)) {
    const newKey = crypto.randomBytes(32).toString('hex');
    fs.writeFileSync(envPath, `ENCRYPTION_KEY=${newKey}\n`, { encoding: 'utf-8', flag: 'a' });
    return Buffer.from(newKey, 'hex');
  }

  const envContent = fs.readFileSync(envPath, 'utf-8');
  const match = envContent.match(/^ENCRYPTION_KEY=(.+)$/m);
  
  if (match && match[1]) {
    const keyString = match[1].trim();
    if (keyString.length === 64) { // 32 bytes hex = 64 chars
        return Buffer.from(keyString, 'hex');
    }
  }

  // Key not found or invalid in existing .env, append it
  const newKey = crypto.randomBytes(32).toString('hex');
  fs.writeFileSync(envPath, `\nENCRYPTION_KEY=${newKey}\n`, { encoding: 'utf-8', flag: 'a' });
  return Buffer.from(newKey, 'hex');
}

export function encrypt(text: string): string {
  if (!text) return text;
  if (text.startsWith(PREFIX)) return text; // Already encrypted

  const key = getOrGenerateKey();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  return `${PREFIX}${iv.toString('hex')}:${encrypted}`;
}

export function decrypt(encryptedText: string): string {
  if (!encryptedText) return encryptedText;
  if (!encryptedText.startsWith(PREFIX)) return encryptedText; // Not encrypted

  try {
    const key = getOrGenerateKey();
    const parts = encryptedText.substring(PREFIX.length).split(':');
    if (parts.length !== 2) return encryptedText; // Invalid format
    
    const iv = Buffer.from(parts[0], 'hex');
    const encryptedData = parts[1];
    
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    console.error('[Encryption] Failed to decrypt string', error);
    return encryptedText; // Return original if decryption fails (fallback)
  }
}
