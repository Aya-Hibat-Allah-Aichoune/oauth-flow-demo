import { useId } from 'react';

export type ActionKey = 'data' | 'admin' | 'no-token' | 'forged' | 'revoked';

interface Action {
  key: ActionKey;
  title: string;
  description: string;
  locked: string;
  expect?: string;
}

const CALLS: Action[] = [
  { key: 'data', title: 'Get my data', description: 'GET /api/data, needs read:data', locked: 'Log in first.' },
  {
    key: 'admin',
    title: 'Admin stats',
    description: 'GET /api/admin/stats, needs admin',
    locked: 'Log in first.',
  },
];

const FAILURES: Action[] = [
  {
    key: 'no-token',
    title: 'No token',
    description: 'No Authorization header at all.',
    locked: '',
    expect: '401',
  },
  {
    key: 'forged',
    title: 'Forged token',
    description: 'Your token with admin scope and a longer life. Same signature.',
    locked: 'Log in first.',
    expect: '401',
  },
  {
    key: 'revoked',
    title: 'Revoked token',
    description: 'The token you had before logging out.',
    locked: 'Log in, then log out.',
    expect: '401',
  },
];

export interface ActionsCardProps {
  signedIn: boolean;
  hasRevokedToken: boolean;
  pending: ActionKey | null;
  onAction: (action: ActionKey) => void;
}

export function ActionsCard({ signedIn, hasRevokedToken, pending, onAction }: ActionsCardProps) {
  const id = useId();
  const busy = pending !== null;

  function isAvailable(key: ActionKey): boolean {
    if (key === 'no-token') return true;
    if (key === 'revoked') return hasRevokedToken;
    return signedIn;
  }

  function renderAction(action: Action) {
    const available = isAvailable(action.key);
    return (
      <li key={action.key}>
        <button
          type="button"
          className={`action ${pending === action.key ? 'is-pending' : ''}`}
          disabled={!available || busy}
          aria-busy={pending === action.key}
          aria-labelledby={`${id}-${action.key}-title`}
          aria-describedby={`${id}-${action.key}-text`}
          onClick={() => onAction(action.key)}
        >
          <span className="action-title" id={`${id}-${action.key}-title`}>
            {action.title}
          </span>
          <span className="action-text" id={`${id}-${action.key}-text`}>
            {available ? action.description : action.locked}
          </span>
          {action.expect && (
            <span className="action-expect" aria-hidden="true">
              {action.expect}
            </span>
          )}
        </button>
      </li>
    );
  }

  return (
    <section className="block" aria-labelledby={`${id}-title`}>
      <div className="block-head">
        <span className="block-number" aria-hidden="true">
          2
        </span>
        <h2 id={`${id}-title`}>Call the service</h2>
      </div>

      <ul className="actions">{CALLS.map(renderAction)}</ul>

      <p className="actions-label">Things that should fail</p>
      <ul className="actions">{FAILURES.map(renderAction)}</ul>
    </section>
  );
}
