import { createService } from './app';
import { createIntrospector } from './authClient';
import { loadConfig } from './config';

try {
  process.loadEnvFile();
} catch {
  /* no .env */
}

const config = loadConfig();
const introspect = createIntrospector({
  authServerUrl: config.authServerUrl,
  clientId: config.clientId,
  clientSecret: config.clientSecret,
  timeoutMs: config.introspectionTimeoutMs,
});

createService(config, introspect).listen(config.port, () => {
  console.log(`[service] listening on http://localhost:${config.port} (auth server: ${config.authServerUrl})`);
});
