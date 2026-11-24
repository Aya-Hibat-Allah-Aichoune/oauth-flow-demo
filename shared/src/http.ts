import type { Response } from 'express';

export interface ErrorBody {
  error: string;
  message: string;
}

export function sendError(res: Response, status: number, error: string, message: string): void {
  res.status(status).json({ error, message } satisfies ErrorBody);
}

export type BearerToken = { status: 'missing' } | { status: 'malformed' } | { status: 'present'; token: string };

const BEARER_PATTERN = /^Bearer +([A-Za-z0-9\-._~+/]+=*)$/i;

export function parseBearer(header: string | undefined): BearerToken {
  if (!header) return { status: 'missing' };
  const token = BEARER_PATTERN.exec(header.trim())?.[1];
  return token ? { status: 'present', token } : { status: 'malformed' };
}

export function clientErrorStatus(err: unknown): number | null {
  if (typeof err !== 'object' || err === null || !('status' in err)) return null;
  const { status } = err;
  return typeof status === 'number' && status >= 400 && status < 500 ? status : null;
}
