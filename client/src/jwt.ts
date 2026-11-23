export interface JwtClaims {
  sub?: string;
  username?: string;
  scope?: string;
  jti?: string;
  iss?: string;
  aud?: string | string[];
  iat?: number;
  exp?: number;
}

export function base64UrlEncode(text: string): string {
  let binary = '';
  for (const byte of new TextEncoder().encode(text)) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function base64UrlDecode(input: string): string {
  const base64 = input
    .replace(/-/g, '+')
    .replace(/_/g, '/')
    .padEnd(Math.ceil(input.length / 4) * 4, '=');
  const bytes = Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export function decodeJwt(token: string): JwtClaims | null {
  const payload = token.split('.')[1];
  if (!payload) return null;
  try {
    return JSON.parse(base64UrlDecode(payload)) as JwtClaims;
  } catch {
    return null;
  }
}

export function decodeJwtHeader(token: string): Record<string, unknown> | null {
  const header = token.split('.')[0];
  if (!header) return null;
  try {
    return JSON.parse(base64UrlDecode(header)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function forgeToken(token: string, changes: Partial<JwtClaims>): string {
  const [header, , signature] = token.split('.');
  const claims = { ...decodeJwt(token), ...changes };
  return [header, base64UrlEncode(JSON.stringify(claims)), signature].join('.');
}
