import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createAuthServer } from '../src/app';
import { loadConfig } from '../src/config';
import { createLoginRateLimiter } from '../src/loginRateLimit';
import { TokenService } from '../src/tokens';

const config = loadConfig({});
const SERVICE = { id: 'data-service', secret: 'data-service-secret' };
const TTL = 60;

function setup(options: { loginMaxAttempts?: number; loginWindowMs?: number; trustProxy?: number } = {}) {
  let now = 1_800_000_000;
  const tokens = new TokenService({
    secret: config.jwtSecret,
    issuer: config.issuer,
    audience: config.audience,
    ttlSeconds: TTL,
    now: () => now,
  });
  const loginRateLimiter =
    options.loginMaxAttempts !== undefined
      ? createLoginRateLimiter({
          maxAttempts: options.loginMaxAttempts,
          windowMs: options.loginWindowMs ?? 60_000,
        })
      : undefined;
  const app = createAuthServer(
    { ...config, trustProxy: options.trustProxy ?? config.trustProxy },
    { tokens, loginRateLimiter },
  );
  return {
    app,
    advanceClock: (seconds: number) => {
      now += seconds;
    },
  };
}

type App = ReturnType<typeof setup>['app'];

async function login(app: App, username = 'david', password = 'david123'): Promise<string> {
  const res = await request(app).post('/login').send({ username, password });
  expect(res.status).toBe(200);
  return res.body.access_token;
}

function introspect(app: App, token: string, client = SERVICE) {
  return request(app).post('/introspect').auth(client.id, client.secret).send({ token });
}

describe('POST /login', () => {
  it('returns a bearer JWT for valid credentials', async () => {
    const { app } = setup();
    const res = await request(app).post('/login').send({ username: 'david', password: 'david123' });

    expect(res.status).toBe(200);
    expect(res.headers['cache-control']).toBe('no-store');
    expect(res.body).toMatchObject({ token_type: 'Bearer', expires_in: TTL, scope: 'read:data' });
    expect(res.body.access_token).toMatch(/^[\w-]+\.[\w-]+\.[\w-]+$/);
  });

  it('accepts form-encoded bodies too', async () => {
    const { app } = setup();
    const res = await request(app).post('/login').type('form').send({ username: 'admin', password: 'admin123' });

    expect(res.status).toBe(200);
    expect(res.body.scope).toBe('read:data admin');
  });

  it('answers 400 when a field is missing', async () => {
    const { app } = setup();
    const res = await request(app).post('/login').send({ username: 'david' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('invalid_request');
  });

  it('answers 400 when the JSON body is malformed', async () => {
    const { app } = setup();
    const res = await request(app).post('/login').set('Content-Type', 'application/json').send('{"username":');

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('invalid_request');
  });

  it('answers 401 with the same message for a wrong password and an unknown user', async () => {
    const { app } = setup();
    const wrongPassword = await request(app).post('/login').send({ username: 'david', password: 'nope' });
    const unknownUser = await request(app).post('/login').send({ username: 'mallory', password: 'nope' });

    expect(wrongPassword.status).toBe(401);
    expect(unknownUser.status).toBe(401);
    expect(wrongPassword.body).toEqual(unknownUser.body);
  });

  it('answers 429 after too many failed login attempts', async () => {
    const { app } = setup({ loginMaxAttempts: 3 });

    const first = await request(app).post('/login').send({ username: 'david', password: 'nope' });
    const second = await request(app).post('/login').send({ username: 'david', password: 'nope' });
    const third = await request(app).post('/login').send({ username: 'david', password: 'nope' });
    const fourth = await request(app).post('/login').send({ username: 'david', password: 'david123' });

    expect(first.status).toBe(401);
    expect(second.status).toBe(401);
    expect(third.status).toBe(429);
    expect(third.body.error).toBe('too_many_requests');
    expect(third.headers['retry-after']).toBeTruthy();
    expect(fourth.status).toBe(429);
  });

  describe('behind a proxy', () => {
    function failFrom(app: App, forwardedFor: string) {
      return request(app)
        .post('/login')
        .set('X-Forwarded-For', forwardedFor)
        .send({ username: 'david', password: 'nope' });
    }

    it('ignores X-Forwarded-For by default, so it cannot be used to skip the limit', async () => {
      const { app } = setup({ loginMaxAttempts: 2 });

      await failFrom(app, '203.0.113.1');
      const second = await failFrom(app, '203.0.113.2');

      expect(second.status).toBe(429);
    });

    it('counts failed logins per client IP when TRUST_PROXY is set', async () => {
      const { app } = setup({ loginMaxAttempts: 2, trustProxy: 1 });

      await failFrom(app, '203.0.113.1');
      const sameIp = await failFrom(app, '203.0.113.1');
      const otherIp = await failFrom(app, '203.0.113.2');

      expect(sameIp.status).toBe(429);
      expect(otherIp.status).toBe(401);
    });

    it('only trusts the entry added by the proxy, not the ones sent by the client', async () => {
      const { app } = setup({ loginMaxAttempts: 2, trustProxy: 1 });

      await failFrom(app, '198.51.100.1, 203.0.113.1');
      const spoofed = await failFrom(app, '198.51.100.2, 203.0.113.1');

      expect(spoofed.status).toBe(429);
    });
  });
});

describe('POST /introspect', () => {
  it('answers 401 when the service does not authenticate', async () => {
    const { app } = setup();
    const token = await login(app);
    const res = await request(app).post('/introspect').send({ token });

    expect(res.status).toBe(401);
    expect(res.headers['www-authenticate']).toContain('Basic');
    expect(res.body.error).toBe('invalid_client');
  });

  it('answers 401 when the service secret is wrong', async () => {
    const { app } = setup();
    const token = await login(app);
    const res = await introspect(app, token, { id: SERVICE.id, secret: 'wrong' });

    expect(res.status).toBe(401);
  });

  it('answers 400 when no token is sent', async () => {
    const { app } = setup();
    const res = await request(app).post('/introspect').auth(SERVICE.id, SERVICE.secret).send({});

    expect(res.status).toBe(400);
  });

  it('reports a valid token as active with its claims', async () => {
    const { app } = setup();
    const token = await login(app);
    const res = await introspect(app, token);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      active: true,
      sub: 'user-1',
      username: 'david',
      scope: 'read:data',
      iss: config.issuer,
      aud: config.audience,
    });
  });

  it('reports garbage as inactive', async () => {
    const { app } = setup();
    const res = await introspect(app, 'not-a-jwt');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ active: false });
  });

  it('reports a token signed with another secret as inactive', async () => {
    const { app } = setup();
    const otherIssuer = new TokenService({
      secret: 'a-completely-different-secret-0123456789',
      issuer: config.issuer,
      audience: config.audience,
      ttlSeconds: TTL,
    });
    const { token } = await otherIssuer.issue({ id: 'user-2', username: 'admin', scopes: ['admin'] });
    const res = await introspect(app, token);

    expect(res.body).toEqual({ active: false });
  });

  it('reports an expired token as inactive', async () => {
    const { app, advanceClock } = setup();
    const token = await login(app);
    advanceClock(TTL + 1);
    const res = await introspect(app, token);

    expect(res.body).toEqual({ active: false });
  });
});

describe('POST /logout', () => {
  it('revokes the token', async () => {
    const { app } = setup();
    const token = await login(app);

    const logout = await request(app).post('/logout').set('Authorization', `Bearer ${token}`);
    expect(logout.status).toBe(204);

    const res = await introspect(app, token);
    expect(res.body).toEqual({ active: false });
  });

  it('answers 401 without a valid token', async () => {
    const { app } = setup();
    const missing = await request(app).post('/logout');
    const invalid = await request(app).post('/logout').set('Authorization', 'Bearer abc.def.ghi');

    expect(missing.status).toBe(401);
    expect(invalid.status).toBe(401);
  });
});

describe('other routes', () => {
  it('has a health check', async () => {
    const { app } = setup();
    const res = await request(app).get('/health');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });

  it('answers 404 in JSON for unknown routes', async () => {
    const { app } = setup();
    const res = await request(app).get('/nope');

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('not_found');
  });

  it('allows the browser client origin on /login', async () => {
    const { app } = setup();
    const res = await request(app)
      .options('/login')
      .set('Origin', config.corsOrigin)
      .set('Access-Control-Request-Method', 'POST');

    expect(res.status).toBe(204);
    expect(res.headers['access-control-allow-origin']).toBe(config.corsOrigin);
  });

  it('does not allow the browser to call /introspect (server to server only)', async () => {
    const { app } = setup();
    const res = await request(app)
      .options('/introspect')
      .set('Origin', config.corsOrigin)
      .set('Access-Control-Request-Method', 'POST');

    expect(res.headers['access-control-allow-origin']).toBeUndefined();
  });
});
