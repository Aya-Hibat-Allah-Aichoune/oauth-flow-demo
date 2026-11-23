export interface ServiceConfig {
  port: number;
  authServerUrl: string;
  clientId: string;
  clientSecret: string;
  introspectionTimeoutMs: number;
  corsOrigin: string;
}

function requireInt(
  name: string,
  raw: string | undefined,
  fallback: number,
  options: { min: number; max?: number },
): number {
  const provided = raw !== undefined;
  const source = provided ? raw : String(fallback);
  const value = Number(source);

  if (source.trim() === '' || !Number.isFinite(value) || !Number.isInteger(value)) {
    throw new Error(
      `${name} must be an integer${provided ? ` (got ${JSON.stringify(raw)})` : ''}. Example: ${fallback}`,
    );
  }
  if (value < options.min) {
    throw new Error(`${name} must be >= ${options.min} (got ${value}).`);
  }
  if (options.max !== undefined && value > options.max) {
    throw new Error(`${name} must be <= ${options.max} (got ${value}).`);
  }
  return value;
}

function requirePort(name: string, raw: string | undefined, fallback: number): number {
  return requireInt(name, raw, fallback, { min: 1, max: 65_535 });
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
