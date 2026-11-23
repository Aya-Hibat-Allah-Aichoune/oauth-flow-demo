import { createAuthServer } from './app';
import { DEV_JWT_SECRET, loadConfig } from './config';

try {
  process.loadEnvFile();
} catch {
  /* no .env */
}

const config = loadConfig();
if (config.jwtSecret === DEV_JWT_SECRET) {
  console.warn('[auth-server] JWT_SECRET is not set, using an insecure development secret.');
}

createAuthServer(config).listen(config.port, () => {
  console.log(`[auth-server] listening on http://localhost:${config.port}`);
});
