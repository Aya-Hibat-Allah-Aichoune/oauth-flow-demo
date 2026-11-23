import request from 'supertest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createService } from '../src/app';
import { AuthServerError, type Introspect, type Introspection } from '../src/authClient';

const CORS_ORIGIN = 'http://localhost:5173';

const KNOWN_TOKENS: Record<string, Introspection> = {
  'david-token': { active: true, sub: 'user-1', username: 'david', scope: 'read:data', exp: 4_000_000_000 },
  'admin-token': { active: true, sub: 'user-2', username: 'admin', scope: 'read:data admin', exp: 4_000_000_000 },
};

function setup(introspect?: Introspect) {
  const fake = vi.fn<Introspect>(introspect ?? (async (token) => KNOWN_TOKENS[token] ?? { active: false }));
  const app = createService({ corsOrigin: CORS_ORIGIN }, fake);
  return { app, introspect: fake };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('GET /api/data', () => {
  it('answers 401 with a Bearer challenge when there is no token', async () => {
    const { app, introspect } = setup();
    const res = await request(app).get('/api/data');

    expect(res.status).toBe(401);
    expect(res.headers['www-authenticate']).toBe('Bearer realm="data-service"');
    expect(res.body.error).toBe('missing_token');
    expect(introspect).not.toHaveBeenCalled();
  });

  it.each(['Basic YWxpY2U6c2VjcmV0', 'Bearer', 'Token abc'])(
    'answers 400 when the Authorization header is malformed (%s)',
    async (header) => {
      const { app, introspect } = setup();
      const res = await request(app).get('/api/data').set('Authorization', header);

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('invalid_request');
      expect(introspect).not.toHaveBeenCalled();
    },
  );

  it('answers 401 when the auth server says the token is not active', async () => {
    const { app, introspect } = setup();
    const res = await request(app).get('/api/data').set('Authorization', 'Bearer expired-token');

    expect(introspect).toHaveBeenCalledWith('expired-token');
    expect(res.status).toBe(401);
    expect(res.headers['www-authenticate']).toContain('error="invalid_token"');
    expect(res.body.error).toBe('invalid_token');
  });

  it('returns the data of the token owner when the token is valid', async () => {
    const { app, introspect } = setup();
    const res = await request(app).get('/api/data').set('Authorization', 'Bearer david-token');

    expect(introspect).toHaveBeenCalledWith('david-token');
    expect(res.status).toBe(200);
    expect(res.headers['cache-control']).toBe('no-store');
    expect(res.body.user).toEqual({ id: 'user-1', username: 'david' });
    expect(res.body.items.length).toBeGreaterThan(0);
  });

  it('answers 503 when the auth server cannot be reached', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const { app } = setup(async () => {
      throw new AuthServerError('unavailable', 'connection refused');
    });
    const res = await request(app).get('/api/data').set('Authorization', 'Bearer david-token');

    expect(res.status).toBe(503);
    expect(res.headers['retry-after']).toBe('5');
    expect(res.body.error).toBe('auth_server_unavailable');
  });

  it('answers 502 when the auth server gives an invalid answer', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const { app } = setup(async () => {
      throw new AuthServerError('bad_response', 'unexpected payload');
    });
    const res = await request(app).get('/api/data').set('Authorization', 'Bearer david-token');

    expect(res.status).toBe(502);
    expect(res.body.error).toBe('auth_server_error');
  });

  it('answers 500 on unexpected errors', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const { app } = setup(async () => {
      throw new Error('boom');
    });
    const res = await request(app).get('/api/data').set('Authorization', 'Bearer david-token');

    expect(res.status).toBe(500);
    expect(res.body.error).toBe('server_error');
  });
});

describe('GET /api/admin/stats', () => {
  it('answers 403 when the token is valid but lacks the admin scope', async () => {
    const { app } = setup();
    const res = await request(app).get('/api/admin/stats').set('Authorization', 'Bearer david-token');

    expect(res.status).toBe(403);
    expect(res.headers['www-authenticate']).toContain('error="insufficient_scope"');
    expect(res.body.error).toBe('insufficient_scope');
  });

  it('returns the stats for an admin', async () => {
    const { app } = setup();
    await request(app).get('/api/data').set('Authorization', 'Bearer david-token');
    const res = await request(app).get('/api/admin/stats').set('Authorization', 'Bearer admin-token');

    expect(res.status).toBe(200);
    expect(res.body.dataRequests).toBe(1);
    expect(typeof res.body.uptimeSeconds).toBe('number');
  });
});

describe('other routes', () => {
  it('answers 404 in JSON for unknown routes', async () => {
    const { app } = setup();
    const res = await request(app).get('/api/nope');

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('not_found');
  });

  it('lets the browser client send the Authorization header (CORS preflight)', async () => {
    const { app } = setup();
    const res = await request(app)
      .options('/api/data')
      .set('Origin', CORS_ORIGIN)
      .set('Access-Control-Request-Method', 'GET')
      .set('Access-Control-Request-Headers', 'authorization');

    expect(res.status).toBe(204);
    expect(res.headers['access-control-allow-origin']).toBe(CORS_ORIGIN);
    expect(res.headers['access-control-allow-headers']).toContain('Authorization');
  });
});
