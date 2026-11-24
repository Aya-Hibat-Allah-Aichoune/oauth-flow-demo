import { clientErrorStatus, parseBearer, sendError } from '@oauth-flow-demo/shared';
import cors from 'cors';
import express, { type NextFunction, type Request, type Response } from 'express';
import { requireClientCredentials } from './clientAuth';
import type { AuthServerConfig } from './config';
import { clientKey, createLoginRateLimiter, type LoginRateLimiter } from './loginRateLimit';
import { TokenService } from './tokens';
import { UserStore } from './users';

export interface AuthServerDeps {
  users?: UserStore;
  tokens?: TokenService;
  loginRateLimiter?: LoginRateLimiter;
}

export function createAuthServer(config: AuthServerConfig, deps: AuthServerDeps = {}) {
  const users = deps.users ?? new UserStore();
  const tokens =
    deps.tokens ??
    new TokenService({
      secret: config.jwtSecret,
      issuer: config.issuer,
      audience: config.audience,
      ttlSeconds: config.tokenTtlSeconds,
    });
  const loginRateLimiter =
    deps.loginRateLimiter ??
    createLoginRateLimiter({
      maxAttempts: config.loginMaxAttempts,
      windowMs: config.loginWindowSeconds * 1000,
    });

  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', config.trustProxy);

  app.use(['/login', '/logout', '/health'], cors({ origin: config.corsOrigin }));
  app.use(express.json({ limit: '10kb' }));
  app.use(express.urlencoded({ extended: false, limit: '10kb' }));

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.post('/login', async (req, res) => {
    const key = clientKey(req);
    const limited = loginRateLimiter.check(key);
    if (limited.blocked) {
      res.set('Retry-After', String(limited.retryAfterSec));
      sendError(res, 429, 'too_many_requests', 'Too many failed login attempts, try again later');
      return;
    }

    const { username, password } = (req.body ?? {}) as Record<string, unknown>;
    if (typeof username !== 'string' || typeof password !== 'string' || !username.trim() || !password) {
      sendError(res, 400, 'invalid_request', 'Both "username" and "password" are required');
      return;
    }

    const user = await users.authenticate(username.trim(), password);
    if (!user) {
      const afterFail = loginRateLimiter.recordFailure(key);
      if (afterFail.blocked) {
        res.set('Retry-After', String(afterFail.retryAfterSec));
        sendError(res, 429, 'too_many_requests', 'Too many failed login attempts, try again later');
        return;
      }
      sendError(res, 401, 'invalid_credentials', 'Invalid username or password');
      return;
    }

    loginRateLimiter.recordSuccess(key);
    const { token, expiresIn } = await tokens.issue(user);
    res.set({ 'Cache-Control': 'no-store', Pragma: 'no-cache' }).json({
      access_token: token,
      token_type: 'Bearer',
      expires_in: expiresIn,
      scope: user.scopes.join(' '),
    });
  });

  app.post('/introspect', requireClientCredentials(config.introspectionClients), async (req, res) => {
    const { token } = (req.body ?? {}) as Record<string, unknown>;
    if (typeof token !== 'string' || !token) {
      sendError(res, 400, 'invalid_request', '"token" is required');
      return;
    }

    const claims = await tokens.verify(token);
    res.set('Cache-Control', 'no-store');
    res.json(claims ? { active: true, token_type: 'Bearer', ...claims } : { active: false });
  });

  app.post('/logout', async (req, res) => {
    const bearer = parseBearer(req.get('authorization'));
    const claims = bearer.status === 'present' ? await tokens.verify(bearer.token) : null;
    if (!claims) {
      res.set('WWW-Authenticate', 'Bearer realm="auth-server", error="invalid_token"');
      sendError(res, 401, 'invalid_token', 'A valid bearer token is required to log out');
      return;
    }

    tokens.revoke(claims);
    res.status(204).end();
  });

  app.use((_req, res) => {
    sendError(res, 404, 'not_found', 'Route not found');
  });

  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    const status = clientErrorStatus(err);
    if (status === 413) {
      sendError(res, 413, 'payload_too_large', 'Request body is too large');
      return;
    }
    if (status) {
      sendError(res, status, 'invalid_request', 'Malformed request body');
      return;
    }
    console.error('[auth-server]', err);
    sendError(res, 500, 'server_error', 'Unexpected server error');
  });

  return app;
}
