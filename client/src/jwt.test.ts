import { describe, expect, it } from 'vitest';
import { base64UrlDecode, base64UrlEncode, decodeJwt, forgeToken } from './jwt';

function makeToken(claims: object): string {
  return [base64UrlEncode(JSON.stringify({ alg: 'HS256' })), base64UrlEncode(JSON.stringify(claims)), 'sig'].join('.');
}

describe('jwt helpers', () => {
  it('round-trips base64url, including non-ASCII text', () => {
    const text = '{"name":"Aÿ ñ ✓"}';
    const encoded = base64UrlEncode(text);

    expect(encoded).not.toMatch(/[+/=]/);
    expect(base64UrlDecode(encoded)).toBe(text);
  });

  it('decodes the payload of a token', () => {
    const token = makeToken({ sub: 'user-1', scope: 'read:data' });

    expect(decodeJwt(token)).toEqual({ sub: 'user-1', scope: 'read:data' });
  });

  it('returns null for something that is not a JWT', () => {
    expect(decodeJwt('nope')).toBeNull();
    expect(decodeJwt('a.%%%.c')).toBeNull();
  });

  it('forges a token: new payload, same header and signature', () => {
    const token = makeToken({ sub: 'user-1', scope: 'read:data' });
    const forged = forgeToken(token, { scope: 'read:data admin' });

    const [header, , signature] = forged.split('.');
    expect(header).toBe(token.split('.')[0]);
    expect(signature).toBe('sig');
    expect(decodeJwt(forged)).toEqual({ sub: 'user-1', scope: 'read:data admin' });
  });
});
