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
    <div className="inspector">
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
            {name === 'encoded' ? 'Encoded' : 'Decoded'}
          </button>
        ))}
      </div>

      {tab === 'encoded' ? (
        <div role="tabpanel" id={`${id}-encoded`} aria-labelledby={`${id}-encoded-tab`}>
          <code className="jwt">
            <span className="jwt-header">{header}</span>.<span className="jwt-payload">{payload}</span>.
            <span className="jwt-signature">{signature}</span>
          </code>
          <ul className="jwt-legend">
            <li className="jwt-header">Header</li>
            <li className="jwt-payload">Payload</li>
            <li className="jwt-signature">Signature</li>
          </ul>
        </div>
      ) : (
        <div role="tabpanel" id={`${id}-decoded`} aria-labelledby={`${id}-decoded-tab`} className="decoded">
          <span className="decoded-label jwt-header">Header</span>
          <JsonView value={decodeJwtHeader(token)} />
          <span className="decoded-label jwt-payload">Payload</span>
          <JsonView value={decodeJwt(token)} />
          <p className="hint">
            Decoded in the browser only to show it. The service never trusts these claims: it asks the auth server.
          </p>
        </div>
      )}
    </div>
  );
}
