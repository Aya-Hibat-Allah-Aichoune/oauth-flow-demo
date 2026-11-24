import { requireInt, requirePort } from '@oauth-flow-demo/shared';

export interface AuthServerConfig {
  port: number;
  issuer: string;
  audience: string;
  jwtSecret: string;
  tokenTtlSeconds: number;
  corsOrigin: string;
  introspectionClients: Map<string, string>;
  loginMaxAttempts: number;
  loginWindowSeconds: number;
  trustProxy: number;
}

export const DEV_JWT_SECRET = 'dev-only-insecure-secret-change-me-0123456789';

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AuthServerConfig {
  const port = requirePort('AUTH_SERVER_PORT', env.AUTH_SERVER_PORT, 4000);
  const nodeEnv = env.NODE_ENV ?? 'development';
  const jwtSecret = env.JWT_SECRET ?? DEV_JWT_SECRET;

  if (nodeEnv === 'production') {
    if (!env.JWT_SECRET) {
      throw new Error(
        'JWT_SECRET is required in production. Set a strong random secret before starting the auth server.',
      );
    }
    if (jwtSecret === DEV_JWT_SECRET) {
      throw new Error(
        'JWT_SECRET must not use the insecure development secret in production. Generate a unique secret.',
      );
    }
  }

  return {
    port,
    issuer: env.JWT_ISSUER ?? `http://localhost:${port}`,
    audience: env.JWT_AUDIENCE ?? 'data-service',
    jwtSecret,
    tokenTtlSeconds: requireInt('TOKEN_TTL_SECONDS', env.TOKEN_TTL_SECONDS, 900, { min: 1 }),
    corsOrigin: env.CORS_ORIGIN ?? 'http://localhost:5173',
    introspectionClients: new Map([
      [env.SERVICE_CLIENT_ID ?? 'data-service', env.SERVICE_CLIENT_SECRET ?? 'data-service-secret'],
    ]),
    loginMaxAttempts: requireInt('LOGIN_MAX_ATTEMPTS', env.LOGIN_MAX_ATTEMPTS, 5, { min: 1 }),
    loginWindowSeconds: requireInt('LOGIN_WINDOW_SECONDS', env.LOGIN_WINDOW_SECONDS, 60, { min: 1 }),
    trustProxy: requireInt('TRUST_PROXY', env.TRUST_PROXY, 0, { min: 0 }),
  };
}
