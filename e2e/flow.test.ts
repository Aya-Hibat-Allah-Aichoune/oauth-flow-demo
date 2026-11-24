import { once } from 'node:events';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { createAuthServer } from '../auth-server/src/app';
import { loadConfig as loadAuthConfig } from '../auth-server/src/config';
import { createService } from '../service/src/app';
import { createIntrospector } from '../service/src/authClient';
import { loadConfig as loadServiceConfig } from '../service/src/config';

describe('OAuth flow: client -> auth server -> service -> auth server', () => {
  let authServer: Server;
  let authUrl: string;
  let service: ReturnType<typeof createService>;

  async function login(username: string, password: string): Promise<string> {
    const res = await request(authUrl).post('/login').send({ username, password });
    expect(res.status).toBe(200);
    return res.body.access_token;
  }

  beforeAll(async () => {
    authServer = createAuthServer(loadAuthConfig({})).listen(0, '127.0.0.1');
    await once(authServer, 'listening');
    authUrl = `http://127.0.0.1:${(authServer.address() as AddressInfo).port}`;

    const config = loadServiceConfig({ AUTH_SERVER_URL: authUrl });
    const introspect = createIntrospector({
      authServerUrl: config.authServerUrl,
      clientId: config.clientId,
      clientSecret: config.clientSecret,
      timeoutMs: config.introspectionTimeoutMs,
    });
    service = createService(config, introspect);
  });

  afterAll(() => {
    if (authServer.listening) authServer.close();
  });

  it('logs in and gets the data (steps 1 to 5)', async () => {
    const token = await login('david', 'david123');

    const res = await request(service).get('/api/data').set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.user.username).toBe('david');
    expect(res.body.items.length).toBeGreaterThan(0);
  });

  it('rejects wrong credentials with 401', async () => {
    const res = await request(authUrl).post('/login').send({ username: 'david', password: 'wrong' });

    expect(res.status).toBe(401);
  });

  it('rejects a token whose payload was changed (forged scope)', async () => {
    const token = await login('david', 'david123');
    const [header, payload, signature] = token.split('.');
    const claims = JSON.parse(Buffer.from(payload!, 'base64url').toString('utf8'));
    const forgedPayload = Buffer.from(JSON.stringify({ ...claims, scope: 'read:data admin' })).toString('base64url');
    const forged = [header, forgedPayload, signature].join('.');

    const res = await request(service).get('/api/admin/stats').set('Authorization', `Bearer ${forged}`);

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('invalid_token');
  });

  it('answers 403 when the user lacks the scope, 200 when they have it', async () => {
    const davidToken = await login('david', 'david123');
    const adminToken = await login('admin', 'admin123');

    const david = await request(service).get('/api/admin/stats').set('Authorization', `Bearer ${davidToken}`);
    const admin = await request(service).get('/api/admin/stats').set('Authorization', `Bearer ${adminToken}`);

    expect(david.status).toBe(403);
    expect(admin.status).toBe(200);
  });

  it('rejects a token right after logout, because the service asks the auth server every time', async () => {
    const token = await login('david', 'david123');
    const before = await request(service).get('/api/data').set('Authorization', `Bearer ${token}`);
    const logout = await request(authUrl).post('/logout').set('Authorization', `Bearer ${token}`);
    const after = await request(service).get('/api/data').set('Authorization', `Bearer ${token}`);

    expect(before.status).toBe(200);
    expect(logout.status).toBe(204);
    expect(after.status).toBe(401);
  });

  it('answers 503 when the auth server is down', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const token = await login('david', 'david123');
    authServer.closeAllConnections();
    await new Promise<void>((resolve) => authServer.close(() => resolve()));

    const res = await request(service).get('/api/data').set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(503);
    expect(res.body.error).toBe('auth_server_unavailable');
  });
});
