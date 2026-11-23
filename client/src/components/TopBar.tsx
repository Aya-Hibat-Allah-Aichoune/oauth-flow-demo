import { Monitor, Moon, Sun, Workflow } from 'lucide-react';
import { AUTH_URL, SERVICE_URL } from '../api';
import { useHealth, type Health } from '../hooks';
import { useTheme } from '../theme';

const THEME_ICONS = { system: Monitor, light: Sun, dark: Moon };
const HEALTH_TEXT: Record<Health, string> = { checking: 'checking…', online: 'online', offline: 'offline' };

export function TopBar() {
  const auth = useHealth(AUTH_URL);
  const service = useHealth(SERVICE_URL);
  const { theme, next, cycle } = useTheme();
  const ThemeIcon = THEME_ICONS[theme];

  return (
    <header className="topbar">
      <div className="topbar-inner">
        <a className="brand" href="#top">
          <span className="brand-mark">
            <Workflow size={16} strokeWidth={2.25} aria-hidden="true" />
          </span>
          <span className="brand-name">OAuth flow</span>
        </a>

        <div className="topbar-actions">
          <HealthPill name="Auth server" port="4000" health={auth} />
          <HealthPill name="Service" port="4001" health={service} />
          <button
            type="button"
            className="icon-button"
            onClick={cycle}
            aria-label={`Theme: ${theme}. Switch to ${next}`}
            title={`Theme: ${theme}`}
          >
            <ThemeIcon size={18} aria-hidden="true" />
          </button>
        </div>
      </div>
    </header>
  );
}

interface HealthPillProps {
  name: string;
  port: string;
  health: Health;
}

function HealthPill({ name, port, health }: HealthPillProps) {
  return (
    <span className={`health health-${health}`} title={`${name} (:${port}) is ${HEALTH_TEXT[health]}`}>
      <span className="health-dot" aria-hidden="true" />
      <span className="health-name">{name}</span>
      <span className="visually-hidden">is {HEALTH_TEXT[health]}</span>
    </span>
  );
}
