import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

const ALGORITHM = 'aes-256-cbc';
const PREFIX = 'encrypted:';

function parseOrDeriveKey(rawKey: string): Buffer {
  const trimmed = rawKey.trim();
  if (/^[0-9a-fA-F]{64}$/.test(trimmed)) {
    return Buffer.from(trimmed, 'hex');
  }
  return crypto.createHash('sha256').update(trimmed).digest();
}

function getOrGenerateKey(): Buffer {
  // 1. Prioriza variável de ambiente (obrigatório em containers/Coolify)
  if (process.env.ENCRYPTION_KEY && process.env.ENCRYPTION_KEY.trim().length > 0) {
    return parseOrDeriveKey(process.env.ENCRYPTION_KEY);
  }

  // 2. Fallback para arquivo dedicado em data/ (persistente no volume)
  const dataKeyPath = path.join(process.cwd(), 'data', '.encryption_key');
  try {
    if (fs.existsSync(dataKeyPath)) {
      const saved = fs.readFileSync(dataKeyPath, 'utf-8').trim();
      if (saved.length > 0) {
        return parseOrDeriveKey(saved);
      }
    }
  } catch {
    // Segue para fallback .env
  }

  // 3. Fallback legado para .env local
  const envPath = path.join(process.cwd(), '.env');
  try {
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf-8');
      const match = envContent.match(/^ENCRYPTION_KEY=(.+)$/m);
      if (match && match[1] && match[1].trim().length > 0) {
        return parseOrDeriveKey(match[1]);
      }
    }
  } catch {
    // Ignora falha de leitura
  }

  // 4. Gera e tenta salvar em data/.encryption_key (ou .env em dev) sem quebrar se o FS for restrito
  const newKey = crypto.randomBytes(32).toString('hex');
  try {
    const dataDir = path.dirname(dataKeyPath);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    fs.writeFileSync(dataKeyPath, `${newKey}\n`, { encoding: 'utf-8', mode: 0o600 });
  } catch {
    try {
      fs.writeFileSync(envPath, `\nENCRYPTION_KEY=${newKey}\n`, { encoding: 'utf-8', flag: 'a' });
    } catch {
      // Último recurso: usa chave gerada em memória
    }
  }
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
