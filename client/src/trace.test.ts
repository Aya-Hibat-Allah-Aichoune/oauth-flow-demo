import { describe, expect, it } from 'vitest';
import type { ApiResult, Exchange } from './api';
import { loginMessages, serviceMessages, withPort } from './trace';

const exchange: Exchange = {
  method: 'GET',
  url: 'http://localhost:4001/api/data',
  requestHeaders: {},
  status: 0,
  durationMs: 1,
  responseBody: null,
};

function ok(status = 200): ApiResult<unknown> {
  return { ok: true, status, data: {}, exchange };
}

function fail(status: number, error: string): ApiResult<unknown> {
  return { ok: false, status, error: { error, message: error }, exchange };
}

const labels = (res: ApiResult<unknown>) => serviceMessages('/api/data', res).map((message) => message.label);

describe('loginMessages', () => {
  it('draws the request and the token coming back', () => {
    const messages = loginMessages(ok());

    expect(messages.map((message) => [message.from, message.to, message.label])).toEqual([
      ['client', 'auth', 'POST /login'],
      ['auth', 'client', '200 access_token'],
    ]);
    expect(messages[1]?.tone).toBe('ok');
  });

  it('only draws the request when the auth server does not answer', () => {
    const messages = loginMessages(fail(0, 'network_error'));

    expect(messages).toHaveLength(1);
    expect(messages[0]?.tone).toBe('error');
  });
});

describe('serviceMessages', () => {
  it('adds the introspection the service does behind the scenes', () => {
    const messages = serviceMessages('/api/data', ok());

    expect(messages.map((message) => message.label)).toEqual([
      'GET /api/data',
      'POST /introspect',
      'active: true',
      '200 OK',
    ]);
    expect(messages.filter((message) => message.inferred)).toHaveLength(2);
  });

  it('skips the introspection when there is no token to check', () => {
    expect(labels(fail(401, 'missing_token'))).toEqual(['GET /api/data', '401 missing_token']);
    expect(labels(fail(400, 'invalid_request'))).toEqual(['GET /api/data', '400 invalid_request']);
  });

  it('shows the auth server saying no to a forged or revoked token', () => {
    const messages = serviceMessages('/api/data', fail(401, 'invalid_token'));

    expect(messages[2]).toMatchObject({ label: 'active: false', tone: 'error' });
  });

  it('shows a valid token that is missing the scope', () => {
    const messages = serviceMessages('/api/admin/stats', fail(403, 'insufficient_scope'));

    expect(messages.map((message) => message.tone)).toEqual(['neutral', 'neutral', 'ok', 'error']);
  });

  it('leaves the introspection unanswered when the auth server is down', () => {
    expect(labels(fail(503, 'auth_server_unavailable'))).toEqual([
      'GET /api/data',
      'POST /introspect',
      '503 auth_server_unavailable',
    ]);
  });
});

describe('withPort', () => {
  it('shows the port for local URLs', () => {
    expect(withPort('Node', 'http://localhost:4000')).toBe('Node · :4000');
  });

  it('leaves it out when the URL uses the default port', () => {
    expect(withPort('Node', 'https://oauth-lab-demo-auth.onrender.com')).toBe('Node');
  });
});
