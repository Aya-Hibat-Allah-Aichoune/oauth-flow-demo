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
  const port = Number(env.AUTH_SERVER_PORT ?? 4000);
  return {
    port,
    issuer: env.JWT_ISSUER ?? `http://localhost:${port}`,
    audience: env.JWT_AUDIENCE ?? 'data-service',
    jwtSecret: env.JWT_SECRET ?? DEV_JWT_SECRET,
    tokenTtlSeconds: Number(env.TOKEN_TTL_SECONDS ?? 900),
    corsOrigin: env.CORS_ORIGIN ?? 'http://localhost:5173',
    introspectionClients: new Map([
      [env.SERVICE_CLIENT_ID ?? 'data-service', env.SERVICE_CLIENT_SECRET ?? 'data-service-secret'],
    ]),
    loginMaxAttempts: Number(env.LOGIN_MAX_ATTEMPTS ?? 5),
    loginWindowSeconds: Number(env.LOGIN_WINDOW_SECONDS ?? 60),
    trustProxy: Number(env.TRUST_PROXY ?? 0),
  };
}
