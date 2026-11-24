import { useState } from 'react';
import { useNow } from '../hooks';
import { useToast } from '../toast';
import { TokenInspector } from './TokenInspector';

export interface Session {
  token: string;
  username: string;
  scope: string;
  issuedAt: number;
  expiresAt: number;
}

export interface SessionCardProps {
  session: Session;
  onLogout: () => void;
}

export function SessionCard({ session, onLogout }: SessionCardProps) {
  const toast = useToast();
  const [copied, setCopied] = useState(false);

  async function copyToken() {
    try {
      await navigator.clipboard.writeText(session.token);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
      toast({ tone: 'success', title: 'Token copied' });
    } catch {
      toast({ tone: 'error', title: 'Could not copy' });
    }
  }

  return (
    <section className="block" aria-labelledby="session-title">
      <div className="block-head">
        <span className="block-number" aria-hidden="true">
          1
        </span>
        <h2 id="session-title">Signed in as {session.username}</h2>
        <button type="button" className="text-button" onClick={onLogout}>
          Log out
        </button>
      </div>

      <p className="scopes">
        scope{' '}
        {session.scope.split(' ').map((scope) => (
          <code key={scope}>{scope}</code>
        ))}
      </p>

      <Expiry issuedAt={session.issuedAt} expiresAt={session.expiresAt} />

      <TokenInspector token={session.token} />

      <button type="button" className="text-button copy-token" onClick={copyToken}>
        {copied ? 'copied' : 'copy token'}
      </button>
    </section>
  );
}

function Expiry({ issuedAt, expiresAt }: { issuedAt: number; expiresAt: number }) {
  const now = useNow(1000);
  const remainingMs = Math.max(0, expiresAt - now);
  const progress = remainingMs / Math.max(1, expiresAt - issuedAt);
  const minutes = Math.floor(remainingMs / 60_000);
  const seconds = Math.floor((remainingMs % 60_000) / 1000);
  const expired = remainingMs === 0;

  return (
    <div className={`expiry ${expired ? 'is-expired' : progress < 0.2 ? 'is-low' : ''}`}>
      <span>{expired ? 'Token expired' : `Token expires in ${minutes}:${String(seconds).padStart(2, '0')}`}</span>
      <span className="expiry-fuse" aria-hidden="true">
        <span style={{ width: `${progress * 100}%` }} />
      </span>
    </div>
  );
}
