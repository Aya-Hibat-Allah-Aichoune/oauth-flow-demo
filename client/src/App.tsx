import { useRef, useState } from 'react';
import { api, type ApiResult } from './api';
import { ActionsCard, type ActionKey } from './components/ActionsCard';
import { LoginForm } from './components/LoginForm';
import { Masthead } from './components/Masthead';
import { MessageInspector } from './components/MessageInspector';
import { SequenceDiagram, type Selection } from './components/SequenceDiagram';
import { SessionCard, type Session } from './components/SessionCard';
import { decodeJwt, forgeToken } from './jwt';
import { useToast } from './toast';
import { loginMessages, logoutMessages, serviceMessages, type Message, type Trace } from './trace';

const MAX_TRACES = 12;

const ONE_YEAR_SECONDS = 365 * 24 * 60 * 60;

function tamper(token: string): string {
  const exp = decodeJwt(token)?.exp ?? 0;
  return forgeToken(token, { scope: 'read:data admin', exp: exp + ONE_YEAR_SECONDS });
}

const SPECS = [
  { name: 'RFC 6749', topic: 'OAuth 2.0', href: 'https://www.rfc-editor.org/rfc/rfc6749' },
  { name: 'RFC 6750', topic: 'Bearer tokens', href: 'https://www.rfc-editor.org/rfc/rfc6750' },
  { name: 'RFC 7662', topic: 'Token introspection', href: 'https://www.rfc-editor.org/rfc/rfc7662' },
];

export function App() {
  const toast = useToast();

  const [session, setSession] = useState<Session | null>(null);
  const [revokedToken, setRevokedToken] = useState<string | null>(null);
  const [traces, setTraces] = useState<Trace[]>([]);
  const [selection, setSelection] = useState<Selection | null>(null);
  const [pending, setPending] = useState<ActionKey | null>(null);
  const ids = useRef(1);

  function addTrace(title: string, note: string, messages: Message[], result: ApiResult<unknown>) {
    const trace: Trace = { id: ids.current++, at: Date.now(), title, note, messages, result };
    setTraces((previous) => [...previous, trace].slice(-MAX_TRACES));
    const answered = messages.some((message) => message.side === 'response' && !message.inferred);
    setSelection({ traceId: trace.id, side: answered ? 'response' : 'request' });
  }

  async function handleLogin(username: string, password: string): Promise<string | null> {
    const res = await api.login(username, password);
    const name = username.trim();
    addTrace(`Log in as ${name || '(empty)'}`, 'Username and password go to the auth server.', loginMessages(res), res);
    if (!res.ok) return res.error.message;

    const now = Date.now();
    setSession({
      token: res.data.access_token,
      username: name,
      scope: res.data.scope,
      issuedAt: now,
      expiresAt: now + res.data.expires_in * 1000,
    });
    toast({ tone: 'success', title: `Signed in as ${name}` });
    return null;
  }

  async function handleLogout() {
    if (!session) return;
    const res = await api.logout(session.token);
    addTrace('Log out', 'The auth server puts the token on its revoke list.', logoutMessages(res), res);
    if (!res.ok) {
      toast({
        tone: 'error',
        title: 'Logout failed',
        description: res.error.message,
      });
      return;
    }
    setRevokedToken(session.token);
    setSession(null);
    toast({ tone: 'info', title: 'Logged out' });
  }

  async function handleAction(action: ActionKey) {
    const owner = session ? `${session.username}'s token` : 'the token';
    const calls: Record<ActionKey, { admin: boolean; token: string | undefined; title: string; note: string }> = {
      data: { admin: false, token: session?.token, title: 'Get my data', note: `Sent with ${owner}.` },
      admin: { admin: true, token: session?.token, title: 'Admin stats', note: `Sent with ${owner}.` },
      'no-token': { admin: false, token: undefined, title: 'No token', note: 'Sent without an Authorization header.' },
      forged: {
        admin: true,
        token: session ? tamper(session.token) : undefined,
        title: 'Forged token',
        note: 'The payload now says admin and expires a year later, but the signature is still the old one.',
      },
      revoked: {
        admin: false,
        token: revokedToken ?? undefined,
        title: 'Revoked token',
        note: 'The token from before the logout, used again.',
      },
    };
    const { admin, token, title, note } = calls[action];

    setPending(action);
    const res = admin ? await api.getAdminStats(token) : await api.getData(token);
    setPending(null);

    addTrace(title, note, serviceMessages(admin ? '/api/admin/stats' : '/api/data', res), res);
  }

  const selectedTrace = traces.find((trace) => trace.id === selection?.traceId) ?? null;

  return (
    <div className="page">
      <Masthead />

      <main className="desk">
        <div className="controls">
          {session ? <SessionCard session={session} onLogout={handleLogout} /> : <LoginForm onLogin={handleLogin} />}
          <ActionsCard
            signedIn={!!session}
            hasRevokedToken={!!revokedToken}
            pending={pending}
            onAction={handleAction}
          />
        </div>

        <div className="sheet">
          <SequenceDiagram
            traces={traces}
            selection={selection}
            onSelect={setSelection}
            onClear={() => {
              setTraces([]);
              setSelection(null);
            }}
          />
          <MessageInspector trace={selectedTrace} side={selectedTrace ? (selection?.side ?? null) : null} />
        </div>
      </main>

      <footer className="colophon">
        <p>Based on</p>
        <ul>
          {SPECS.map((spec) => (
            <li key={spec.name}>
              <a href={spec.href} target="_blank" rel="noreferrer">
                {spec.name}
              </a>{' '}
              {spec.topic}
            </li>
          ))}
        </ul>
      </footer>
    </div>
  );
}
