import { CircleExclamationPoint, Eye, EyeOff, LoaderCircle, Lock, LogIn, User } from 'lucide-react';
import { useState, type FormEvent } from 'react';

const DEMO_ACCOUNTS = [
  { username: 'david', password: 'david123', scope: 'read:data' },
  { username: 'admin', password: 'admin123', scope: 'read:data admin' },
];

export interface LoginFormProps {
  onLogin: (username: string, password: string) => Promise<string | null>;
}

export function LoginForm({ onLogin }: LoginFormProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    const message = await onLogin(username, password);
    setError(message);
    setAttempt((count) => count + 1);
    setSubmitting(false);
  }

  function fillDemoAccount(account: (typeof DEMO_ACCOUNTS)[number]) {
    setUsername(account.username);
    setPassword(account.password);
    setError(null);
  }

  return (
    <section className="card" aria-labelledby="login-title">
      <div className="card-header">
        <div>
          <h2 id="login-title">Log in</h2>
          <p className="card-subtitle">Authenticate against the auth server.</p>
        </div>
      </div>

      <div className="demo-accounts" role="group" aria-label="Demo accounts">
        {DEMO_ACCOUNTS.map((account) => (
          <button
            key={account.username}
            type="button"
            className={`account ${username === account.username ? 'is-selected' : ''}`}
            onClick={() => fillDemoAccount(account)}
          >
            <span className="avatar avatar-sm" aria-hidden="true">
              {account.username[0]?.toUpperCase()}
            </span>
            <span className="account-text">
              <strong>{account.username}</strong>
              <span>{account.scope}</span>
            </span>
          </button>
        ))}
      </div>

      <form className="form" onSubmit={handleSubmit} noValidate>
        <div className="field">
          <label htmlFor="username">Username</label>
          <div className="input-wrap">
            <User className="input-icon" size={16} aria-hidden="true" />
            <input
              id="username"
              autoComplete="username"
              placeholder="david"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
            />
          </div>
        </div>

        <div className="field">
          <label htmlFor="password">Password</label>
          <div className="input-wrap">
            <Lock className="input-icon" size={16} aria-hidden="true" />
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
            <button
              type="button"
              className="input-action"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              aria-pressed={showPassword}
              onClick={() => setShowPassword((shown) => !shown)}
            >
              {showPassword ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}
            </button>
          </div>
        </div>

        {error && (
          <p key={attempt} className="form-error" role="alert">
            <CircleExclamationPoint size={16} aria-hidden="true" />
            {error}
          </p>
        )}

        <button type="submit" className="btn btn-primary btn-block" disabled={submitting}>
          {submitting ? (
            <LoaderCircle className="spin" size={16} aria-hidden="true" />
          ) : (
            <LogIn size={16} aria-hidden="true" />
          )}
          Log in
        </button>
      </form>
    </section>
  );
}
