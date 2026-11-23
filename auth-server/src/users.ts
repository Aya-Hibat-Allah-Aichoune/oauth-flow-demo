import { hashPassword, verifyPassword } from './password';

export interface User {
  id: string;
  username: string;
  scopes: string[];
}

export interface SeedUser extends User {
  password: string;
}

export const DEMO_USERS: SeedUser[] = [
  { id: 'user-1', username: 'david', password: 'david123', scopes: ['read:data'] },
  { id: 'user-2', username: 'admin', password: 'admin123', scopes: ['read:data', 'admin'] },
];

interface StoredUser extends User {
  passwordHash: string;
}

export class UserStore {
  private readonly users = new Map<string, StoredUser>();

  private readonly decoyHash = hashPassword('decoy-password');

  constructor(seed: SeedUser[] = DEMO_USERS) {
    for (const { password, ...user } of seed) {
      this.users.set(user.username, { ...user, passwordHash: hashPassword(password) });
    }
  }

  async authenticate(username: string, password: string): Promise<User | null> {
    const stored = this.users.get(username);
    const valid = await verifyPassword(password, stored?.passwordHash ?? this.decoyHash);
    if (!stored || !valid) return null;
    return { id: stored.id, username: stored.username, scopes: [...stored.scopes] };
  }
}
