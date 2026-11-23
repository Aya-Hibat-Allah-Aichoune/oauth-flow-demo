import { Braces, CircleCheck, Circle, CircleExclamationPoint, Inbox, Timer } from 'lucide-react';
import type { AdminStats, ApiResult, DataResponse } from '../api';
import { JsonView } from './JsonView';
import { StatusBadge } from './StatusBadge';

export interface ServiceResult {
  id: number;
  request: string;
  label: string;
  res: ApiResult<DataResponse | AdminStats>;
}

const WHY: Record<string, string> = {
  missing_token: 'No Authorization header.',
  invalid_request: 'Expected Authorization: Bearer <token>.',
  invalid_token: 'Token inactive (forged, expired, or revoked).',
  insufficient_scope: 'Token valid, but missing the required scope.',
  auth_server_unavailable: 'Auth server unreachable.',
  auth_server_error: 'Unexpected response from the auth server.',
  network_error: 'Could not reach the service.',
};

export interface ResponseViewProps {
  result: ServiceResult | null;
}

export function ResponseView({ result }: ResponseViewProps) {
  return (
    <section className="card" aria-labelledby="response-title" aria-live="polite">
      <div className="card-header">
        <div>
          <h2 id="response-title">Service response</h2>
          <p className="card-subtitle">Last response from the service.</p>
        </div>
      </div>

      {!result ? (
        <div className="empty-state">
          <span className="empty-icon">
            <Inbox size={22} aria-hidden="true" />
          </span>
          <p>Log in and call the service to see its answer here.</p>
        </div>
      ) : (
        <div className="response" key={result.id}>
          <div className="response-meta">
            <StatusBadge status={result.res.status} />
            <code className="response-request">{result.request}</code>
            <span className="meta-item">
              <Timer size={14} aria-hidden="true" />
              {result.res.exchange.durationMs} ms
            </span>
            <span className="chip">{result.label}</span>
          </div>

          {result.res.ok ? (
            <ResponseData data={result.res.data} />
          ) : (
            <div className="callout callout-error">
              <CircleExclamationPoint size={18} aria-hidden="true" />
              <div>
                <strong className="callout-code">{result.res.error.error}</strong>
                <p>{result.res.error.message}</p>
                {WHY[result.res.error.error] && <p className="callout-why">{WHY[result.res.error.error]}</p>}
              </div>
            </div>
          )}

          <details className="raw">
            <summary>
              <Braces size={14} aria-hidden="true" />
              Raw JSON
            </summary>
            <JsonView value={result.res.exchange.responseBody} />
          </details>
        </div>
      )}
    </section>
  );
}

function ResponseData({ data }: { data: DataResponse | AdminStats }) {
  if ('items' in data) {
    const done = data.items.filter((item) => item.done).length;
    return (
      <div>
        <p className="response-summary">
          {data.items.length} items for <strong>{data.user.username}</strong> · {done} done
        </p>
        <ul className="items">
          {data.items.map((item) => (
            <li key={item.id} className={item.done ? 'is-done' : ''}>
              {item.done ? (
                <CircleCheck className="item-icon" size={18} aria-hidden="true" />
              ) : (
                <Circle className="item-icon" size={18} aria-hidden="true" />
              )}
              <span>{item.title}</span>
              <span className="visually-hidden">{item.done ? '(done)' : '(to do)'}</span>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div className="stats">
      <div className="stat">
        <span className="stat-value">{data.dataRequests}</span>
        <span className="stat-label">Data requests served</span>
      </div>
      <div className="stat">
        <span className="stat-value">{formatUptime(data.uptimeSeconds)}</span>
        <span className="stat-label">Service uptime</span>
      </div>
    </div>
  );
}

function formatUptime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ${seconds % 60}s`;
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}
