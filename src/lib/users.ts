import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

export type UserRole = 'ADMIN' | 'ANALISTA';

export interface AppUser {
  id: string;
  username: string;
  name: string;
  role: UserRole;
  active: boolean;
  passwordHash: string;
  createdAt: string;
  updatedAt: string;
}

export type PublicAppUser = Omit<AppUser, 'passwordHash'>;

function getUsersFilePath(): string {
  return path.join(process.cwd(), 'data', 'users.json');
}

function ensureDataDir() {
  const dir = path.dirname(getUsersFilePath());
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `scrypt:${salt}:${hash}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  if (!storedHash || !storedHash.startsWith('scrypt:')) return false;
  const parts = storedHash.split(':');
  if (parts.length !== 3) return false;
  const [, salt, originalHex] = parts;
  if (!salt || !originalHex) return false;

  try {
    const derived = crypto.scryptSync(password, salt, 64);
    const original = Buffer.from(originalHex, 'hex');
    if (derived.length !== original.length) return false;
    return crypto.timingSafeEqual(derived, original);
  } catch {
    return false;
  }
}

function buildSeedUsers(): AppUser[] {
  const now = new Date().toISOString();
  const adminPassword = process.env.DEFAULT_ADMIN_PASSWORD || 'admin123';
  return [
    {
      id: 'usr-admin-seed',
      username: 'admin',
      name: 'Administrador Goverdoc',
      role: 'ADMIN',
      active: true,
      passwordHash: hashPassword(adminPassword),
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'usr-analista-seed',
      username: 'analista',
      name: 'Analista Clínico',
      role: 'ANALISTA',
      active: true,
      passwordHash: hashPassword('analista123'),
      createdAt: now,
      updatedAt: now,
    },
  ];
}

function saveUsers(users: AppUser[]) {
  ensureDataDir();
  fs.writeFileSync(getUsersFilePath(), JSON.stringify(users, null, 2), 'utf-8');
}

export function getUsers(): AppUser[] {
  ensureDataDir();
  const filePath = getUsersFilePath();

  if (!fs.existsSync(filePath)) {
    const seed = buildSeedUsers();
    saveUsers(seed);
    return seed;
  }

  try {
    const raw = fs.readFileSync(filePath, 'utf-8').trim();
    if (!raw) {
      const seed = buildSeedUsers();
      saveUsers(seed);
      return seed;
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      const seed = buildSeedUsers();
      saveUsers(seed);
      return seed;
    }
    return parsed as AppUser[];
  } catch (err) {
    console.error('[Users] Erro ao ler users.json:', err);
    return buildSeedUsers();
  }
}

export function toPublicUser(user: AppUser): PublicAppUser {
  const { passwordHash: _ignored, ...rest } = user;
  return rest;
}

export function getPublicUsers(): PublicAppUser[] {
  return getUsers().map(toPublicUser);
}

export function authenticateUser(username: string, password: string): PublicAppUser | null {
  const normalized = String(username || '').trim().toLowerCase();
  if (!normalized || !password) return null;

  const users = getUsers();
  const found = users.find((u) => u.username.toLowerCase() === normalized);
  if (!found || !found.active) return null;

  if (!verifyPassword(password, found.passwordHash)) {
    return null;
  }

  return toPublicUser(found);
}

export function createUser(input: {
  username: string;
  name: string;
  password: string;
  role: UserRole;
  active?: boolean;
}): PublicAppUser {
  const username = String(input.username || '').trim().toLowerCase();
  const name = String(input.name || '').trim();
  const password = String(input.password || '');
  const role: UserRole = input.role === 'ADMIN' ? 'ADMIN' : 'ANALISTA';

  if (!username || username.length < 3) {
    throw new Error('O nome de usuário deve possuir ao menos 3 caracteres.');
  }
  if (!/^[a-z0-9._-]+$/.test(username)) {
    throw new Error('O usuário deve conter apenas letras minúsculas, números, ponto, traço ou sublinhado.');
  }
  if (!name) {
    throw new Error('O nome completo é obrigatório.');
  }
  if (!password || password.length < 6) {
    throw new Error('A senha deve possuir ao menos 6 caracteres.');
  }

  const users = getUsers();
  if (users.some((u) => u.username.toLowerCase() === username)) {
    throw new Error(`Já existe um usuário cadastrado com o login "${username}".`);
  }

  const now = new Date().toISOString();
  const created: AppUser = {
    id: `usr-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    username,
    name,
    role,
    active: input.active !== undefined ? Boolean(input.active) : true,
    passwordHash: hashPassword(password),
    createdAt: now,
    updatedAt: now,
  };

  saveUsers([...users, created]);
  return toPublicUser(created);
}

export function updateUser(
  id: string,
  input: {
    name?: string;
    role?: UserRole;
    active?: boolean;
    password?: string;
  }
): PublicAppUser {
  const users = getUsers();
  const idx = users.findIndex((u) => u.id === id);
  if (idx === -1) {
    throw new Error('Usuário não encontrado.');
  }

  const current = users[idx];
  const nextRole: UserRole = input.role ? (input.role === 'ADMIN' ? 'ADMIN' : 'ANALISTA') : current.role;
  const nextActive = input.active !== undefined ? Boolean(input.active) : current.active;

  // Impedir remoção/desativação do último administrador ativo
  if (current.role === 'ADMIN' && (nextRole !== 'ADMIN' || !nextActive)) {
    const remainingActiveAdmins = users.filter(
      (u) => u.id !== id && u.role === 'ADMIN' && u.active
    ).length;
    if (remainingActiveAdmins === 0) {
      throw new Error('Não é possível rebaixar ou desativar o único administrador ativo do sistema.');
    }
  }

  if (input.password && input.password.length > 0 && input.password.length < 6) {
    throw new Error('A nova senha deve possuir ao menos 6 caracteres.');
  }

  const updated: AppUser = {
    ...current,
    name: input.name !== undefined ? String(input.name).trim() || current.name : current.name,
    role: nextRole,
    active: nextActive,
    passwordHash: input.password && input.password.length >= 6 ? hashPassword(input.password) : current.passwordHash,
    updatedAt: new Date().toISOString(),
  };

  const nextList = [...users];
  nextList[idx] = updated;
  saveUsers(nextList);
  return toPublicUser(updated);
}

export function deleteUser(id: string, requesterUserId?: string): void {
  if (requesterUserId && id === requesterUserId) {
    throw new Error('Você não pode excluir o usuário que está atualmente conectado.');
  }

  const users = getUsers();
  const target = users.find((u) => u.id === id);
  if (!target) {
    throw new Error('Usuário não encontrado.');
  }

  if (target.role === 'ADMIN' && target.active) {
    const otherActiveAdmins = users.filter(
      (u) => u.id !== id && u.role === 'ADMIN' && u.active
    ).length;
    if (otherActiveAdmins === 0) {
      throw new Error('Não é possível excluir o único administrador ativo do sistema.');
    }
  }

  const nextList = users.filter((u) => u.id !== id);
  saveUsers(nextList);
}
