import { Check, Copy, LogOut } from 'lucide-react';
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
    <section className="card" aria-labelledby="session-title">
      <div className="session-head">
        <span className="avatar" aria-hidden="true">
          {session.username[0]?.toUpperCase()}
        </span>
        <div className="session-who">
          <h2 id="session-title">Signed in as {session.username}</h2>
          <div className="chips">
            {session.scope.split(' ').map((scope) => (
              <span key={scope} className="chip chip-accent">
                {scope}
              </span>
            ))}
          </div>
        </div>
        <button type="button" className="btn btn-ghost btn-sm" onClick={onLogout}>
          <LogOut size={15} aria-hidden="true" />
          Log out
        </button>
      </div>

      <div className="session-token">
        <ExpiryRing issuedAt={session.issuedAt} expiresAt={session.expiresAt} />
        <button type="button" className="btn btn-sm" onClick={copyToken}>
          {copied ? <Check size={15} aria-hidden="true" /> : <Copy size={15} aria-hidden="true" />}
          {copied ? 'Copied' : 'Copy token'}
        </button>
      </div>

      <TokenInspector token={session.token} />
    </section>
  );
}

const RING_RADIUS = 16;
const RING_LENGTH = 2 * Math.PI * RING_RADIUS;

function ExpiryRing({ issuedAt, expiresAt }: { issuedAt: number; expiresAt: number }) {
  const now = useNow(1000);
  const remainingMs = Math.max(0, expiresAt - now);
  const progress = remainingMs / Math.max(1, expiresAt - issuedAt);
  const minutes = Math.floor(remainingMs / 60_000);
  const seconds = Math.floor((remainingMs % 60_000) / 1000);
  const expired = remainingMs === 0;
  const tone = expired ? 'is-expired' : progress < 0.2 ? 'is-low' : '';

  return (
    <div className={`expiry ${tone}`}>
      <svg className="expiry-ring" viewBox="0 0 40 40" aria-hidden="true">
        <circle className="expiry-track" cx="20" cy="20" r={RING_RADIUS} />
        <circle
          className="expiry-value"
          cx="20"
          cy="20"
          r={RING_RADIUS}
          strokeDasharray={RING_LENGTH}
          strokeDashoffset={RING_LENGTH * (1 - progress)}
        />
      </svg>
      <div className="expiry-text">
        <span className="expiry-label">Access token</span>
        <strong>{expired ? 'Expired' : `Expires in ${minutes}:${String(seconds).padStart(2, '0')}`}</strong>
      </div>
    </div>
  );
}
