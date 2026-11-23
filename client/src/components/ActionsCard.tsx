import { Ban, Database, LoaderCircle, Pencil, ShieldCheck, ShieldOff, type LucideIcon } from 'lucide-react';
import { useId } from 'react';

export type ActionKey = 'data' | 'admin' | 'no-token' | 'forged' | 'revoked';

interface Scenario {
  key: ActionKey;
  title: string;
  description: string;
  icon: LucideIcon;
  requirement: string;
}

const SCENARIOS: Scenario[] = [
  {
    key: 'no-token',
    title: 'No token',
    description: 'Call without Authorization header.',
    icon: ShieldOff,
    requirement: '',
  },
  {
    key: 'forged',
    title: 'Forged token',
    description: 'Tampered payload (admin scope) with the original signature.',
    icon: Pencil,
    requirement: 'Log in first.',
  },
  {
    key: 'revoked',
    title: 'Revoked token',
    description: 'Reuse a token after logout.',
    icon: Ban,
    requirement: 'Log in, then log out.',
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

  const icon = (key: ActionKey, Icon: LucideIcon) =>
    pending === key ? (
      <LoaderCircle className="spin" size={16} aria-hidden="true" />
    ) : (
      <Icon size={16} aria-hidden="true" />
    );

  return (
    <section className="card" aria-labelledby={`${id}-title`}>
      <div className="card-header">
        <div>
          <h2 id={`${id}-title`}>Call the service</h2>
          <p className="card-subtitle">Protected endpoints on the resource service.</p>
        </div>
      </div>

      <div className="button-row">
        <button type="button" className="btn btn-primary" disabled={!signedIn || busy} onClick={() => onAction('data')}>
          {icon('data', Database)}
          Get my data
        </button>
        <button type="button" className="btn" disabled={!signedIn || busy} onClick={() => onAction('admin')}>
          {icon('admin', ShieldCheck)}
          Admin stats
        </button>
      </div>
      <p className="hint">
        <code>admin</code> scope required for admin stats (<strong>david</strong> → 403).
      </p>

      <div className="section-label">
        <span>Failure cases</span>
      </div>
      <div className="scenarios">
        {SCENARIOS.map((scenario) => {
          const available = isAvailable(scenario.key);
          const Icon = scenario.icon;
          return (
            <button
              key={scenario.key}
              type="button"
              className="scenario"
              disabled={!available || busy}
              aria-labelledby={`${id}-${scenario.key}-title`}
              aria-describedby={`${id}-${scenario.key}-text`}
              onClick={() => onAction(scenario.key)}
            >
              <span className="scenario-icon">{icon(scenario.key, Icon)}</span>
              <span className="scenario-body">
                <span className="scenario-title" id={`${id}-${scenario.key}-title`}>
                  {scenario.title}
                </span>
                <span className="scenario-text" id={`${id}-${scenario.key}-text`}>
                  {available ? scenario.description : scenario.requirement}
                </span>
              </span>
              <span className="scenario-expect" aria-hidden="true">
                401
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
