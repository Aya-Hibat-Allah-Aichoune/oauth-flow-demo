import type { AdminStats, DataResponse, Exchange } from '../api';
import { decodeJwt } from '../jwt';
import type { Side, Trace } from '../trace';
import { JsonView } from './JsonView';
import { StatusBadge } from './StatusBadge';

const WHY: Record<string, string> = {
  invalid_credentials: 'Same answer for a wrong password and an unknown user, so usernames cannot be guessed.',
  too_many_requests: 'Too many failed logins from this IP. Wait for the time in Retry-After.',
  missing_token: 'There was no Authorization header, so the service did not even ask the auth server.',
  invalid_request: 'The header has to look like "Authorization: Bearer <token>".',
  invalid_token: 'The auth server said the token is not active: it was forged, expired or revoked.',
  insufficient_scope: 'The token is valid, but it is missing the required scope.',
  auth_server_unavailable: 'The service could not reach the auth server, so it cannot trust any token.',
  auth_server_error: 'The auth server sent an answer the service did not understand.',
  network_error: 'The browser could not reach the server.',
};

export interface MessageInspectorProps {
  trace: Trace | null;
  side: Side | null;
}

export function MessageInspector({ trace, side }: MessageInspectorProps) {
  return (
    <section className="block inspector" aria-labelledby="inspector-title">
      <div className="block-head">
        <span className="block-number" aria-hidden="true">
          4
        </span>
        <h2 id="inspector-title">Message</h2>
        {trace && (
          <span className="block-meta">
            #{trace.id} · {trace.title}
          </span>
        )}
      </div>

      {trace ? (
        <div className="parts">
          <RequestPart exchange={trace.result.exchange} selected={side === 'request'} />
          <ResponsePart trace={trace} selected={side === 'response'} />
        </div>
      ) : (
        <p className="muted">Click any solid or dashed arrow in the diagram to read the HTTP message behind it.</p>
      )}
    </section>
  );
}

function displayHeaders(headers: Record<string, string>): Record<string, string> {
  return Object.fromEntries(
    Object.entries(headers).map(([name, value]) => [
      name,
      name.toLowerCase() === 'authorization' && value.length > 40 ? `${value.slice(0, 36)}…` : value,
    ]),
  );
}

function RequestPart({ exchange, selected }: { exchange: Exchange; selected: boolean }) {
  const authorization = exchange.requestHeaders.Authorization;
  const token = authorization?.startsWith('Bearer ') ? authorization.slice(7) : null;

  return (
    <div className={`part ${selected ? 'is-selected' : ''}`}>
      <h3>Request</h3>
      <p className="part-line">
        <strong>{exchange.method}</strong> {exchange.url}
      </p>
      <p className="part-label">Headers</p>
      <JsonView value={displayHeaders(exchange.requestHeaders)} />
      {exchange.requestBody !== undefined && (
        <>
          <p className="part-label">Body</p>
          <JsonView value={exchange.requestBody} />
        </>
      )}
      {token && (
        <>
          <p className="part-label">Token payload, decoded here only to show it</p>
          <JsonView value={decodeJwt(token)} />
        </>
      )}
    </div>
  );
}

function ResponsePart({ trace, selected }: { trace: Trace; selected: boolean }) {
  const { result } = trace;
  const { exchange } = result;

  return (
    <div className={`part ${selected ? 'is-selected' : ''}`}>
      <h3>Response</h3>
      <p className="part-line">
        <StatusBadge status={result.status} /> <span className="muted">{exchange.durationMs} ms</span>
      </p>

      {!result.ok && (
        <div className="callout">
          <strong>{result.error.error}</strong>
          <p>{result.error.message}</p>
          {WHY[result.error.error] && <p className="callout-why">{WHY[result.error.error]}</p>}
        </div>
      )}

      {result.ok && isServiceData(result.data) && <ServiceData data={result.data} />}

      {exchange.status !== 0 && (
        <>
          <p className="part-label">Body</p>
          <JsonView value={exchange.status === 204 ? undefined : exchange.responseBody} />
        </>
      )}
    </div>
  );
}

function isServiceData(data: unknown): data is DataResponse | AdminStats {
  return typeof data === 'object' && data !== null && ('items' in data || 'dataRequests' in data);
}

function ServiceData({ data }: { data: DataResponse | AdminStats }) {
  if ('items' in data) {
    return (
      <ul className="items" aria-label={`Items for ${data.user.username}`}>
        {data.items.map((item) => (
          <li key={item.id} className={item.done ? 'is-done' : ''}>
            <span className="item-box" aria-hidden="true">
              {item.done ? '✓' : ''}
            </span>
            {item.title}
            <span className="visually-hidden">{item.done ? '(done)' : '(to do)'}</span>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <dl className="stats">
      <div>
        <dt>Data requests served</dt>
        <dd>{data.dataRequests}</dd>
      </div>
      <div>
        <dt>Service uptime</dt>
        <dd>{formatUptime(data.uptimeSeconds)}</dd>
      </div>
    </dl>
  );
}

function formatUptime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ${seconds % 60}s`;
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}
