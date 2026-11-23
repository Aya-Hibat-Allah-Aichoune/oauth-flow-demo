import { useId, useState } from 'react';
import { decodeJwt, decodeJwtHeader } from '../jwt';
import { JsonView } from './JsonView';

type Tab = 'encoded' | 'decoded';

export interface TokenInspectorProps {
  token: string;
}

export function TokenInspector({ token }: TokenInspectorProps) {
  const [tab, setTab] = useState<Tab>('encoded');
  const id = useId();
  const [header = '', payload = '', signature = ''] = token.split('.');

  return (
    <div className="token">
      <div className="tabs" role="tablist" aria-label="Access token">
        {(['encoded', 'decoded'] as const).map((name) => (
          <button
            key={name}
            type="button"
            role="tab"
            id={`${id}-${name}-tab`}
            aria-selected={tab === name}
            aria-controls={`${id}-${name}`}
            className="tab"
            onClick={() => setTab(name)}
          >
            {name}
          </button>
        ))}
      </div>

      {tab === 'encoded' ? (
        <div role="tabpanel" id={`${id}-encoded`} aria-labelledby={`${id}-encoded-tab`}>
          <code className="jwt">
            <span className="jwt-header">{header}</span>.<span className="jwt-payload">{payload}</span>.
            <span className="jwt-signature">{signature}</span>
          </code>
          <p className="jwt-legend">
            <span className="jwt-header">header</span> . <span className="jwt-payload">payload</span> .{' '}
            <span className="jwt-signature">signature</span>
          </p>
        </div>
      ) : (
        <div role="tabpanel" id={`${id}-decoded`} aria-labelledby={`${id}-decoded-tab`}>
          <p className="part-label jwt-header">header</p>
          <JsonView value={decodeJwtHeader(token)} />
          <p className="part-label jwt-payload">payload</p>
          <JsonView value={decodeJwt(token)} />
          <p className="muted small">
            Decoded here only to show it. The service never trusts these claims: it asks the auth server.
          </p>
        </div>
      )}
    </div>
  );
}
