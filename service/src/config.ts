import { requireInt, requirePort } from '@oauth-flow-demo/shared';

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
    port: requirePort('SERVICE_PORT', env.SERVICE_PORT, 4001),
    authServerUrl: env.AUTH_SERVER_URL ?? 'http://localhost:4000',
    clientId: env.SERVICE_CLIENT_ID ?? 'data-service',
    clientSecret: env.SERVICE_CLIENT_SECRET ?? 'data-service-secret',
    introspectionTimeoutMs: requireInt('INTROSPECTION_TIMEOUT_MS', env.INTROSPECTION_TIMEOUT_MS, 3000, {
      min: 1,
    }),
    corsOrigin: env.CORS_ORIGIN ?? 'http://localhost:5173',
  };
}
