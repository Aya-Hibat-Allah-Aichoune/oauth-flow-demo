import { ChevronDown, Network, Trash } from 'lucide-react';
import { useState } from 'react';
import type { Exchange } from '../api';
import { JsonView } from './JsonView';
import { StatusBadge } from './StatusBadge';

export interface LogEntry {
  id: number;
  at: number;
  target: 'Auth server' | 'Service';
  label: string;
  exchange: Exchange;
}

export interface NetworkLogProps {
  entries: LogEntry[];
  onClear: () => void;
}

function displayHeaders(headers: Record<string, string>): Record<string, string> {
  return Object.fromEntries(
    Object.entries(headers).map(([name, value]) => [
      name,
      name.toLowerCase() === 'authorization' && value.length > 40 ? `${value.slice(0, 36)}…` : value,
    ]),
  );
}

export function NetworkLog({ entries, onClear }: NetworkLogProps) {
  const [openId, setOpenId] = useState<number | null>(null);

  return (
    <section className="card" aria-labelledby="network-title">
      <div className="card-header">
        <div>
          <h2 id="network-title">Network log</h2>
          <p className="card-subtitle">Outgoing requests from this page.</p>
        </div>
        <button type="button" className="btn btn-ghost btn-sm" onClick={onClear} disabled={entries.length === 0}>
          <Trash size={15} aria-hidden="true" />
          Clear
        </button>
      </div>

      {entries.length === 0 ? (
        <div className="empty-state">
          <span className="empty-icon">
            <Network size={22} aria-hidden="true" />
          </span>
          <p>No requests yet.</p>
        </div>
      ) : (
        <ul className="requests">
          {entries.map((entry) => {
            const open = openId === entry.id;
            const { exchange } = entry;
            const path = new URL(exchange.url).pathname;
            return (
              <li key={entry.id} className={`request ${open ? 'is-open' : ''}`}>
                <button
                  type="button"
                  className="request-row"
                  aria-expanded={open}
                  aria-controls={`request-${entry.id}`}
                  onClick={() => setOpenId(open ? null : entry.id)}
                >
                  <span className={`method method-${exchange.method.toLowerCase()}`}>{exchange.method}</span>
                  <span className="request-path">{path}</span>
                  <span className="request-target">{entry.target}</span>
                  <span className="request-label">{entry.label}</span>
                  <StatusBadge status={exchange.status} />
                  <span className="request-time">{exchange.durationMs} ms</span>
                  <ChevronDown className="request-chevron" size={16} aria-hidden="true" />
                </button>

                {open && (
                  <div className="request-details" id={`request-${entry.id}`}>
                    <div>
                      <h3>Request</h3>
                      <p className="request-url">
                        {exchange.method} {exchange.url}
                      </p>
                      <JsonView value={displayHeaders(exchange.requestHeaders)} />
                      {exchange.requestBody !== undefined && <JsonView value={exchange.requestBody} />}
                    </div>
                    <div>
                      <h3>Response</h3>
                      <p className="request-url">
                        {exchange.status === 0 ? 'No response' : `Status ${exchange.status}`} ·{' '}
                        {new Date(entry.at).toLocaleTimeString()}
                      </p>
                      <JsonView value={exchange.status === 204 ? undefined : exchange.responseBody} />
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
