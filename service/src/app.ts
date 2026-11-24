import cors from 'cors';
import express, { type NextFunction, type Request, type Response } from 'express';
import { AuthServerError, type Introspect } from './authClient';
import type { ServiceConfig } from './config';
import { itemsFor } from './data';
import { sendError } from '@oauth-flow-demo/shared';
import { currentUser, requireAuth } from './requireAuth';

export function createService(config: Pick<ServiceConfig, 'corsOrigin'>, introspect: Introspect) {
  const startedAt = Date.now();
  let dataRequests = 0;

  const app = express();
  app.disable('x-powered-by');
  app.use(
    cors({
      origin: config.corsOrigin,
      allowedHeaders: ['Authorization', 'Content-Type'],
      exposedHeaders: ['WWW-Authenticate'],
    }),
  );

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.get('/api/data', requireAuth(introspect, 'read:data'), (_req, res) => {
    const user = currentUser(res);
    dataRequests += 1;
    res.set('Cache-Control', 'no-store').json({
      user: { id: user.id, username: user.username },
      items: itemsFor(user.id),
    });
  });

  app.get('/api/admin/stats', requireAuth(introspect, 'admin'), (_req, res) => {
    res.set('Cache-Control', 'no-store').json({
      dataRequests,
      uptimeSeconds: Math.round((Date.now() - startedAt) / 1000),
    });
  });

  app.use((_req, res) => {
    sendError(res, 404, 'not_found', 'Route not found');
  });

  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof AuthServerError) {
      console.error(`[service] ${err.message}`);
      if (err.failure === 'unavailable') {
        res.set('Retry-After', '5');
        sendError(res, 503, 'auth_server_unavailable', 'The token cannot be validated right now, try again later');
      } else {
        sendError(res, 502, 'auth_server_error', 'The auth server gave an invalid answer');
      }
      return;
    }
    console.error('[service]', err);
    sendError(res, 500, 'server_error', 'Unexpected server error');
  });

  return app;
}
