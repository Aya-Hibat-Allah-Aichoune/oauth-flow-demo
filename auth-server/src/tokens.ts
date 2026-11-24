import { randomUUID } from 'node:crypto';
import { SignJWT, jwtVerify } from 'jose';
import type { User } from './users';

export interface AccessTokenClaims {
  sub: string;
  username: string;
  scope: string;
  jti: string;
  iss: string;
  aud: string;
  iat: number;
  exp: number;
}

export interface TokenServiceOptions {
  secret: string;
  issuer: string;
  audience: string;
  ttlSeconds: number;

  now?: () => number;
}

export class TokenService {
  private readonly options: TokenServiceOptions;
  private readonly key: Uint8Array;
  private readonly now: () => number;
  private readonly revoked = new Map<string, number>();

  constructor(options: TokenServiceOptions) {
    if (options.secret.length < 32) {
      throw new Error('The JWT secret must be at least 32 characters long');
    }
    this.options = options;
    this.key = new TextEncoder().encode(options.secret);
    this.now = options.now ?? (() => Math.floor(Date.now() / 1000));
  }

  async issue(user: User): Promise<{ token: string; expiresIn: number }> {
    const issuedAt = this.now();
    const token = await new SignJWT({ username: user.username, scope: user.scopes.join(' ') })
      .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
      .setSubject(user.id)
      .setIssuer(this.options.issuer)
      .setAudience(this.options.audience)
      .setJti(randomUUID())
      .setIssuedAt(issuedAt)
      .setExpirationTime(issuedAt + this.options.ttlSeconds)
      .sign(this.key);
    return { token, expiresIn: this.options.ttlSeconds };
  }

  async verify(token: string): Promise<AccessTokenClaims | null> {
    let payload;
    try {
      ({ payload } = await jwtVerify(token, this.key, {
        algorithms: ['HS256'],
        issuer: this.options.issuer,
        audience: this.options.audience,
        currentDate: new Date(this.now() * 1000),
      }));
    } catch {
      return null;
    }

    const { sub, jti, iat, exp, username, scope } = payload;
    if (
      typeof sub !== 'string' ||
      typeof jti !== 'string' ||
      typeof iat !== 'number' ||
      typeof exp !== 'number' ||
      typeof username !== 'string' ||
      typeof scope !== 'string'
    ) {
      return null;
    }
    if (this.revoked.has(jti)) return null;

    return { sub, jti, iat, exp, username, scope, iss: this.options.issuer, aud: this.options.audience };
  }

  revoke(claims: AccessTokenClaims): void {
    this.revoked.set(claims.jti, claims.exp);
    this.pruneRevoked();
  }

  private pruneRevoked(): void {
    const now = this.now();
    for (const [jti, exp] of this.revoked) {
      if (exp <= now) this.revoked.delete(jti);
    }
  }
}
