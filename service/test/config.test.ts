import { describe, expect, it } from 'vitest';
import { loadConfig } from '../src/config';

describe('service loadConfig', () => {
  it('keeps the local development defaults', () => {
    const config = loadConfig({});

    expect(config.port).toBe(4001);
    expect(config.authServerUrl).toBe('http://localhost:4000');
    expect(config.introspectionTimeoutMs).toBe(3000);
  });

  it('rejects invalid numeric environment variables', () => {
    expect(() => loadConfig({ SERVICE_PORT: 'abc' })).toThrow(/SERVICE_PORT/);
    expect(() => loadConfig({ SERVICE_PORT: '0' })).toThrow(/SERVICE_PORT/);
    expect(() => loadConfig({ SERVICE_PORT: '70000' })).toThrow(/SERVICE_PORT/);
    expect(() => loadConfig({ INTROSPECTION_TIMEOUT_MS: '-5' })).toThrow(/INTROSPECTION_TIMEOUT_MS/);
    expect(() => loadConfig({ INTROSPECTION_TIMEOUT_MS: '2.5' })).toThrow(/INTROSPECTION_TIMEOUT_MS/);
    expect(() => loadConfig({ INTROSPECTION_TIMEOUT_MS: '' })).toThrow(/INTROSPECTION_TIMEOUT_MS/);
  });

  it('parses a valid introspection timeout', () => {
    expect(loadConfig({ INTROSPECTION_TIMEOUT_MS: '1500' }).introspectionTimeoutMs).toBe(1500);
  });
});
