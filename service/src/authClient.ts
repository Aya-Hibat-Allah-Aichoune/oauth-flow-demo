export interface TokenInfo {
  sub: string;
  username: string;
  scope: string;
  exp: number;
}

export type Introspection = ({ active: true } & TokenInfo) | { active: false };

export type Introspect = (token: string) => Promise<Introspection>;

export type AuthServerFailure = 'unavailable' | 'bad_response';

export class AuthServerError extends Error {
  readonly failure: AuthServerFailure;

  constructor(failure: AuthServerFailure, message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'AuthServerError';
    this.failure = failure;
  }
}

function isIntrospection(value: unknown): value is Introspection {
  if (typeof value !== 'object' || value === null) return false;
  const body = value as Record<string, unknown>;
  if (body.active === false) return true;
  return (
    body.active === true &&
    typeof body.sub === 'string' &&
    typeof body.username === 'string' &&
    typeof body.scope === 'string' &&
    typeof body.exp === 'number'
  );
}

export interface IntrospectorOptions {
  authServerUrl: string;
  clientId: string;
  clientSecret: string;
  timeoutMs?: number;
  fetch?: typeof fetch;
}

export function createIntrospector(options: IntrospectorOptions): Introspect {
  const { authServerUrl, clientId, clientSecret, timeoutMs = 3000, fetch: fetchImpl = fetch } = options;
  const endpoint = new URL('/introspect', authServerUrl);
  const authorization = `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`;

  return async (token) => {
    let response: Response;
    try {
      response = await fetchImpl(endpoint, {
        method: 'POST',
        headers: {
          Authorization: authorization,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({ token }),
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch (cause) {
      throw new AuthServerError('unavailable', 'Could not reach the auth server', { cause });
    }

    if (!response.ok) {
      throw new AuthServerError('bad_response', `Auth server answered ${response.status} to the introspection request`);
    }

    const body: unknown = await response.json().catch(() => null);
    if (!isIntrospection(body)) {
      throw new AuthServerError('bad_response', 'Auth server sent an unexpected introspection payload');
    }

    return body.active
      ? { active: true, sub: body.sub, username: body.username, scope: body.scope, exp: body.exp }
      : { active: false };
  };
}
