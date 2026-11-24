import { useEffect, useState } from 'react';
import { isHealthy } from './api';

export function useNow(intervalMs = 1000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(timer);
  }, [intervalMs]);
  return now;
}

export type Health = 'checking' | 'online' | 'offline';

export function useHealth(baseUrl: string, intervalMs = 5000): Health {
  const [health, setHealth] = useState<Health>('checking');

  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      const healthy = await isHealthy(baseUrl);
      if (!cancelled) setHealth(healthy ? 'online' : 'offline');
    };
    void check();
    const timer = window.setInterval(check, intervalMs);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [baseUrl, intervalMs]);

  return health;
}
