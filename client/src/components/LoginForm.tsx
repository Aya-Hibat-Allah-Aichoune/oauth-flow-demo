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
    <section className="block" aria-labelledby="login-title">
      <div className="block-head">
        <span className="block-number" aria-hidden="true">
          1
        </span>
        <h2 id="login-title">Log in</h2>
      </div>

      <p className="block-intro">Pick a demo account or type one in. The password goes to the auth server only.</p>

      <div className="accounts" role="group" aria-label="Demo accounts">
        {DEMO_ACCOUNTS.map((account) => (
          <button
            key={account.username}
            type="button"
            className={`account ${username === account.username ? 'is-selected' : ''}`}
            onClick={() => fillDemoAccount(account)}
          >
            <strong>{account.username}</strong>
            <span>{account.scope}</span>
          </button>
        ))}
      </div>

      <form className="form" onSubmit={handleSubmit} noValidate>
        <label className="field">
          <span>Username</span>
          <input
            autoComplete="username"
            placeholder="david"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
          />
        </label>

        <div className="field">
          <label htmlFor="password">Password</label>
          <div className="field-row">
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
              className="text-button"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              aria-pressed={showPassword}
              onClick={() => setShowPassword((shown) => !shown)}
            >
              {showPassword ? 'hide' : 'show'}
            </button>
          </div>
        </div>

        {error && (
          <p key={attempt} className="form-error" role="alert">
            {error}
          </p>
        )}

        <button type="submit" className="button button-solid" disabled={submitting} aria-busy={submitting}>
          Log in
        </button>
      </form>
    </section>
  );
}
