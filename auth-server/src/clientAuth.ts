import { createHash, timingSafeEqual } from 'node:crypto';
import type { RequestHandler } from 'express';
import { sendError } from '@oauth-flow-demo/shared';

export interface ClientCredentials {
  id: string;
  secret: string;
}

export function parseBasicAuth(header: string | undefined): ClientCredentials | null {
  const encoded = header ? /^Basic +([A-Za-z0-9+/]+=*)$/i.exec(header.trim())?.[1] : undefined;
  if (!encoded) return null;
  const decoded = Buffer.from(encoded, 'base64').toString('utf8');
  const separator = decoded.indexOf(':');
  if (separator < 0) return null;
  return { id: decoded.slice(0, separator), secret: decoded.slice(separator + 1) };
}

function safeEqual(a: string, b: string): boolean {
  const hashA = createHash('sha256').update(a).digest();
  const hashB = createHash('sha256').update(b).digest();
  return timingSafeEqual(hashA, hashB);
}

export function requireClientCredentials(clients: Map<string, string>): RequestHandler {
  return (req, res, next) => {
    const credentials = parseBasicAuth(req.get('authorization'));
    const expectedSecret = credentials ? clients.get(credentials.id) : undefined;

    if (!credentials || expectedSecret === undefined || !safeEqual(credentials.secret, expectedSecret)) {
      res.set('WWW-Authenticate', 'Basic realm="introspection"');
      sendError(res, 401, 'invalid_client', 'Client authentication failed');
      return;
    }

    next();
  };
}
