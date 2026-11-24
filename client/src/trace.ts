import { AUTH_URL, SERVICE_URL, type ApiResult } from './api';

export type NodeId = 'client' | 'auth' | 'service';

export type Tone = 'ok' | 'error' | 'neutral';

export type Side = 'request' | 'response';

export interface Message {
  from: NodeId;
  to: NodeId;
  label: string;
  tone: Tone;
  side: Side;
  inferred?: boolean;
}

export interface Trace {
  id: number;
  at: number;
  title: string;
  note: string;
  messages: Message[];
  result: ApiResult<unknown>;
}

export function withPort(runtime: string, url: string): string {
  const { port } = new URL(url);
  return port ? `${runtime} · :${port}` : runtime;
}

export const NODES: Record<NodeId, { name: string; detail: string }> = {
  client: { name: 'Client', detail: withPort('React', window.location.origin) },
  auth: { name: 'Auth server', detail: withPort('Node', AUTH_URL) },
  service: { name: 'Service', detail: withPort('Node', SERVICE_URL) },
};

function answer(from: NodeId, res: ApiResult<unknown>, okLabel: string): Message {
  return {
    from,
    to: 'client',
    side: 'response',
    label: res.ok ? `${res.status} ${okLabel}` : `${res.status} ${res.error.error}`,
    tone: res.ok ? 'ok' : 'error',
  };
}

function ask(to: NodeId, label: string, res: ApiResult<unknown>): Message {
  return { from: 'client', to, side: 'request', label, tone: res.status === 0 ? 'error' : 'neutral' };
}

export function loginMessages(res: ApiResult<unknown>): Message[] {
  const request = ask('auth', 'POST /login', res);
  return res.status === 0 ? [request] : [request, answer('auth', res, 'access_token')];
}

export function logoutMessages(res: ApiResult<unknown>): Message[] {
  const request = ask('auth', 'POST /logout', res);
  return res.status === 0 ? [request] : [request, answer('auth', res, 'token revoked')];
}

export function serviceMessages(path: string, res: ApiResult<unknown>): Message[] {
  const request = ask('service', `GET ${path}`, res);
  if (res.status === 0) return [request];

  const response = answer('service', res, 'OK');
  const code = res.ok ? null : res.error.error;
  if (code === 'missing_token' || code === 'invalid_request') return [request, response];

  const introspect: Message = {
    from: 'service',
    to: 'auth',
    side: 'request',
    label: 'POST /introspect',
    tone: code === 'auth_server_unavailable' ? 'error' : 'neutral',
    inferred: true,
  };
  if (code === 'auth_server_unavailable') return [request, introspect, response];

  const verdict: Message = {
    from: 'auth',
    to: 'service',
    side: 'response',
    label:
      code === 'auth_server_error' ? 'unexpected answer' : code === 'invalid_token' ? 'active: false' : 'active: true',
    tone: code === 'auth_server_error' || code === 'invalid_token' ? 'error' : 'ok',
    inferred: true,
  };
  return [request, introspect, verdict, response];
}
