import { describe, expect, it, vi } from 'vitest';
import { AuthServerError, createIntrospector } from '../src/authClient';

const OPTIONS = { authServerUrl: 'http://auth.test', clientId: 'data-service', clientSecret: 's3cret' };

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

function setup(respond: () => Promise<Response>) {
  const fetchMock = vi.fn<typeof fetch>(respond);
  const introspect = createIntrospector({ ...OPTIONS, fetch: fetchMock });
  return { fetchMock, introspect };
}

describe('createIntrospector', () => {
  it('posts the token to /introspect with the service credentials', async () => {
    const active = { active: true, sub: 'user-1', username: 'david', scope: 'read:data', exp: 123, jti: 'x' };
    const { fetchMock, introspect } = setup(async () => jsonResponse(active));

    const result = await introspect('the-token');

    expect(result).toEqual({ active: true, sub: 'user-1', username: 'david', scope: 'read:data', exp: 123 });
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(String(url)).toBe('http://auth.test/introspect');
    expect(init?.method).toBe('POST');
    expect(init?.body).toBe(JSON.stringify({ token: 'the-token' }));
    const headers = init?.headers as Record<string, string>;
    expect(headers.Authorization).toBe(`Basic ${Buffer.from('data-service:s3cret').toString('base64')}`);
  });

  it('returns inactive tokens as they are', async () => {
    const { introspect } = setup(async () => jsonResponse({ active: false }));

    await expect(introspect('old-token')).resolves.toEqual({ active: false });
  });

  it('throws "unavailable" when the auth server cannot be reached', async () => {
    const { introspect } = setup(async () => {
      throw new TypeError('fetch failed');
    });

    const error = await introspect('t').catch((e: unknown) => e);
    expect(error).toBeInstanceOf(AuthServerError);
    expect((error as AuthServerError).failure).toBe('unavailable');
  });

  it('throws "bad_response" when the auth server rejects the service', async () => {
    const { introspect } = setup(async () => jsonResponse({ error: 'invalid_client' }, 401));

    const error = await introspect('t').catch((e: unknown) => e);
    expect((error as AuthServerError).failure).toBe('bad_response');
  });

  it('throws "bad_response" when the payload is not an introspection response', async () => {
    const { introspect } = setup(async () => jsonResponse({ active: true }));

    const error = await introspect('t').catch((e: unknown) => e);
    expect((error as AuthServerError).failure).toBe('bad_response');
  });
});
