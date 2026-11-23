export const AUTH_URL = import.meta.env.VITE_AUTH_URL ?? 'http://localhost:4000';
export const SERVICE_URL = import.meta.env.VITE_SERVICE_URL ?? 'http://localhost:4001';

export function hostOf(url: string): string {
  return new URL(url).host;
}

export interface ApiError {
  error: string;
  message: string;
}

export interface Exchange {
  method: 'GET' | 'POST';
  url: string;
  requestHeaders: Record<string, string>;

  requestBody?: unknown;

  status: number;
  durationMs: number;
  responseBody: unknown;
}

export type ApiResult<T> = { status: number; exchange: Exchange } & (
  { ok: true; data: T } | { ok: false; error: ApiError }
);

export interface LoginResponse {
  access_token: string;
  token_type: 'Bearer';
  expires_in: number;
  scope: string;
}

export interface Item {
  id: number;
  title: string;
  done: boolean;
}

export interface DataResponse {
  user: { id: string; username: string };
  items: Item[];
}

export interface AdminStats {
  dataRequests: number;
  uptimeSeconds: number;
}

function isApiError(value: unknown): value is ApiError {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as ApiError).error === 'string' &&
    typeof (value as ApiError).message === 'string'
  );
}

interface CallOptions {
  method?: 'GET' | 'POST';
  headers?: Record<string, string>;
  body?: unknown;

  safeBody?: unknown;
}

async function call<T>(url: string, options: CallOptions = {}): Promise<ApiResult<T>> {
  const { method = 'GET', body, safeBody = body } = options;
  const headers =
    body === undefined ? (options.headers ?? {}) : { 'Content-Type': 'application/json', ...options.headers };
  const startedAt = performance.now();
  const exchange = (status: number, responseBody: unknown): Exchange => ({
    method,
    url,
    requestHeaders: headers,
    requestBody: safeBody,
    status,
    durationMs: Math.round(performance.now() - startedAt),
    responseBody,
  });

  let response: Response;
  try {
    response = await fetch(url, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  } catch {
    const error = { error: 'network_error', message: `Could not reach ${new URL(url).origin}. Is it running?` };
    return { ok: false, status: 0, error, exchange: exchange(0, null) };
  }

  const responseBody: unknown = await response.json().catch(() => null);
  if (response.ok) {
    return {
      ok: true,
      status: response.status,
      data: responseBody as T,
      exchange: exchange(response.status, responseBody),
    };
  }
  return {
    ok: false,
    status: response.status,
    error: isApiError(responseBody)
      ? responseBody
      : { error: 'http_error', message: response.statusText || `HTTP ${response.status}` },
    exchange: exchange(response.status, responseBody),
  };
}

function bearer(token: string | undefined): Record<string, string> {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export const api = {
  login: (username: string, password: string) =>
    call<LoginResponse>(`${AUTH_URL}/login`, {
      method: 'POST',
      body: { username, password },
      safeBody: { username, password: '•'.repeat(8) },
    }),

  logout: (token: string) => call<null>(`${AUTH_URL}/logout`, { method: 'POST', headers: bearer(token) }),

  getData: (token?: string) => call<DataResponse>(`${SERVICE_URL}/api/data`, { headers: bearer(token) }),

  getAdminStats: (token?: string) => call<AdminStats>(`${SERVICE_URL}/api/admin/stats`, { headers: bearer(token) }),
};

export async function isHealthy(baseUrl: string): Promise<boolean> {
  try {
    const response = await fetch(`${baseUrl}/health`, { signal: AbortSignal.timeout(2000) });
    return response.ok;
  } catch {
    return false;
  }
}
