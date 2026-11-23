import type { RequestHandler, Response } from 'express';
import type { Introspect } from './authClient';
import { parseBearer, sendError } from '@oauth-flow-demo/shared';

export interface AuthenticatedUser {
  id: string;
  username: string;
  scopes: string[];
}

const REALM = 'data-service';

function challenge(res: Response, extra = ''): void {
  res.set('WWW-Authenticate', `Bearer realm="${REALM}"${extra}`);
}

export function requireAuth(introspect: Introspect, requiredScope?: string): RequestHandler {
  return async (req, res, next) => {
    const bearer = parseBearer(req.get('authorization'));

    if (bearer.status === 'missing') {
      challenge(res);
      sendError(res, 401, 'missing_token', 'An access token is required: send "Authorization: Bearer <token>"');
      return;
    }
    if (bearer.status === 'malformed') {
      challenge(res, ', error="invalid_request"');
      sendError(res, 400, 'invalid_request', 'The Authorization header must look like "Bearer <token>"');
      return;
    }

    const info = await introspect(bearer.token);
    if (!info.active) {
      challenge(res, ', error="invalid_token"');
      sendError(res, 401, 'invalid_token', 'The access token is invalid, expired or revoked');
      return;
    }

    const scopes = info.scope.split(' ').filter(Boolean);
    if (requiredScope && !scopes.includes(requiredScope)) {
      challenge(res, `, error="insufficient_scope", scope="${requiredScope}"`);
      sendError(res, 403, 'insufficient_scope', `This resource requires the "${requiredScope}" scope`);
      return;
    }

    const user: AuthenticatedUser = { id: info.sub, username: info.username, scopes };
    res.locals.user = user;
    next();
  };
}

export function currentUser(res: Response): AuthenticatedUser {
  return res.locals.user as AuthenticatedUser;
}
