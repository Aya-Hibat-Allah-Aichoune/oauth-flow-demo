import { afterEach, describe, expect, it } from 'vitest';
import { DEV_JWT_SECRET, loadConfig } from '../src/config';

const originalNodeEnv = process.env.NODE_ENV;

afterEach(() => {
  process.env.NODE_ENV = originalNodeEnv;
});

describe('auth-server loadConfig', () => {
  it('keeps the local development defaults', () => {
    const config = loadConfig({ NODE_ENV: 'development' });

    expect(config.port).toBe(4000);
    expect(config.tokenTtlSeconds).toBe(900);
    expect(config.loginMaxAttempts).toBe(5);
    expect(config.loginWindowSeconds).toBe(60);
    expect(config.trustProxy).toBe(0);
    expect(config.jwtSecret).toBe(DEV_JWT_SECRET);
  });

  it('rejects invalid numeric environment variables', () => {
    expect(() => loadConfig({ AUTH_SERVER_PORT: 'abc' })).toThrow(/AUTH_SERVER_PORT/);
    expect(() => loadConfig({ AUTH_SERVER_PORT: '0' })).toThrow(/AUTH_SERVER_PORT/);
    expect(() => loadConfig({ AUTH_SERVER_PORT: '70000' })).toThrow(/AUTH_SERVER_PORT/);
    expect(() => loadConfig({ TOKEN_TTL_SECONDS: '-1' })).toThrow(/TOKEN_TTL_SECONDS/);
    expect(() => loadConfig({ TOKEN_TTL_SECONDS: '1.5' })).toThrow(/TOKEN_TTL_SECONDS/);
    expect(() => loadConfig({ LOGIN_MAX_ATTEMPTS: '0' })).toThrow(/LOGIN_MAX_ATTEMPTS/);
    expect(() => loadConfig({ LOGIN_WINDOW_SECONDS: 'NaN' })).toThrow(/LOGIN_WINDOW_SECONDS/);
    expect(() => loadConfig({ TRUST_PROXY: '-1' })).toThrow(/TRUST_PROXY/);
  });

  it('accepts a zero TRUST_PROXY hop count', () => {
    expect(loadConfig({ TRUST_PROXY: '0' }).trustProxy).toBe(0);
  });

  it('refuses to start in production without JWT_SECRET', () => {
    expect(() => loadConfig({ NODE_ENV: 'production' })).toThrow(/JWT_SECRET is required in production/);
  });

  it('refuses the development JWT secret in production', () => {
    expect(() =>
      loadConfig({
        NODE_ENV: 'production',
        JWT_SECRET: DEV_JWT_SECRET,
      }),
    ).toThrow(/must not use the insecure development secret/);
  });

  it('accepts a real JWT secret in production', () => {
    const config = loadConfig({
      NODE_ENV: 'production',
      JWT_SECRET: 'render-or-docker-production-secret',
      AUTH_SERVER_PORT: '10000',
      TRUST_PROXY: '2',
    });

    expect(config.jwtSecret).toBe('render-or-docker-production-secret');
    expect(config.port).toBe(10_000);
    expect(config.trustProxy).toBe(2);
  });
});
