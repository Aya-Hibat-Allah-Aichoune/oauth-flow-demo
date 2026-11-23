export interface ServiceConfig {
  port: number;
  authServerUrl: string;
  clientId: string;
  clientSecret: string;
  introspectionTimeoutMs: number;
  corsOrigin: string;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): ServiceConfig {
  return {
    port: Number(env.SERVICE_PORT ?? 4001),
    authServerUrl: env.AUTH_SERVER_URL ?? 'http://localhost:4000',
    clientId: env.SERVICE_CLIENT_ID ?? 'data-service',
    clientSecret: env.SERVICE_CLIENT_SECRET ?? 'data-service-secret',
    introspectionTimeoutMs: Number(env.INTROSPECTION_TIMEOUT_MS ?? 3000),
    corsOrigin: env.CORS_ORIGIN ?? 'http://localhost:5173',
  };
}
