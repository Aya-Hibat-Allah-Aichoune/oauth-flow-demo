import { useRef, useState } from 'react';
import { api, type ApiResult } from './api';
import { ActionsCard, type ActionKey } from './components/ActionsCard';
import { FlowVisualizer } from './components/FlowVisualizer';
import { LoginForm } from './components/LoginForm';
import { NetworkLog, type LogEntry } from './components/NetworkLog';
import { ResponseView, type ServiceResult } from './components/ResponseView';
import { SessionCard, type Session } from './components/SessionCard';
import { TopBar } from './components/TopBar';
import { IDLE_FLOW, loginSteps, serviceSteps, type FlowState, type Run } from './flow';
import { forgeToken } from './jwt';
import { useToast } from './toast';

export function App() {
  const toast = useToast();

  const [session, setSession] = useState<Session | null>(null);
  const [revokedToken, setRevokedToken] = useState<string | null>(null);
  const [flow, setFlow] = useState<FlowState>(IDLE_FLOW);
  const [run, setRun] = useState<Run | null>(null);
  const [result, setResult] = useState<ServiceResult | null>(null);
  const [log, setLog] = useState<LogEntry[]>([]);
  const [pending, setPending] = useState<ActionKey | null>(null);
  const ids = useRef(1);
  const nextId = () => ids.current++;

  function record(target: LogEntry['target'], label: string, res: ApiResult<unknown>) {
    const entry: LogEntry = { id: nextId(), at: Date.now(), target, label, exchange: res.exchange };
    setLog((previous) => [entry, ...previous].slice(0, 30));
  }

  function showFlow(states: FlowState, steps: number[]) {
    setFlow(states);
    setRun({ id: nextId(), steps: steps.filter((step) => states[step] !== 'idle') });
  }

  async function handleLogin(username: string, password: string): Promise<string | null> {
    const res = await api.login(username, password);
    record('Auth server', `login as "${username}"`, res);
    showFlow(loginSteps(res.ok), [0, 1]);
    setResult(null);
    if (!res.ok) return res.error.message;

    const now = Date.now();
    setSession({
      token: res.data.access_token,
      username: username.trim(),
      scope: res.data.scope,
      issuedAt: now,
      expiresAt: now + res.data.expires_in * 1000,
    });
    toast({ tone: 'success', title: `Signed in as ${username.trim()}` });
    return null;
  }

  async function handleLogout() {
    if (!session) return;
    const res = await api.logout(session.token);
    record('Auth server', 'revoke the token', res);
    if (res.ok) {
      setRevokedToken(session.token);
      toast({ tone: 'info', title: 'Logged out' });
    }
    setSession(null);
    setFlow(IDLE_FLOW);
    setRun(null);
    setResult(null);
  }

  async function handleAction(action: ActionKey) {
    const calls: Record<ActionKey, { admin: boolean; token: string | undefined; label: string }> = {
      data: { admin: false, token: session?.token, label: 'valid token' },
      admin: { admin: true, token: session?.token, label: 'valid token' },
      'no-token': { admin: false, token: undefined, label: 'no token' },
      forged: {
        admin: true,
        token: session ? forgeToken(session.token, { scope: 'read:data admin' }) : undefined,
        label: 'forged token',
      },
      revoked: { admin: false, token: revokedToken ?? undefined, label: 'revoked token' },
    };
    const { admin, token, label } = calls[action];
    const request = admin ? 'GET /api/admin/stats' : 'GET /api/data';

    setPending(action);
    const res = admin ? await api.getAdminStats(token) : await api.getData(token);
    setPending(null);

    record('Service', label, res);
    const [step3, step4, step5] = serviceSteps(res.status, res.ok ? undefined : res.error.error);
    showFlow([flow[0], flow[1], step3, step4, step5], [2, 3, 4]);
    setResult({ id: nextId(), request, label, res });
  }

  return (
    <div className="shell" id="top">
      <TopBar />

      <main className="page">
        <section className="hero">
          <h1>OAuth flow</h1>
          <p>Log in, call the API, and follow the token between client, auth server, and service.</p>
        </section>

        <div className="layout">
          <div className="column">
            {session ? <SessionCard session={session} onLogout={handleLogout} /> : <LoginForm onLogin={handleLogin} />}
            <ActionsCard
              signedIn={!!session}
              hasRevokedToken={!!revokedToken}
              pending={pending}
              onAction={handleAction}
            />
          </div>
          <div className="column">
            <FlowVisualizer
              flow={flow}
              run={run}
              onReplay={() => setRun((current) => current && { ...current, id: nextId() })}
            />
            <ResponseView result={result} />
          </div>
        </div>

        <NetworkLog entries={log} onClear={() => setLog([])} />
      </main>

      <footer className="footer">
        <p>localhost:5173 · auth :4000 · service :4001</p>
      </footer>
    </div>
  );
}
