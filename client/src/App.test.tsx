import { render, screen, within } from '@testing-library/react';
import userEvent, { type UserEvent } from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { App } from './App';
import { base64UrlEncode } from './jwt';

const TOKEN = [
  base64UrlEncode(JSON.stringify({ alg: 'HS256', typ: 'JWT' })),
  base64UrlEncode(JSON.stringify({ sub: 'user-1', username: 'david', scope: 'read:data', exp: 2_000_000_000 })),
  'signature',
].join('.');

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

function mockBackend() {
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const authorization = new Headers(init?.headers).get('Authorization');

    if (url.endsWith('/health')) return json({ status: 'ok' });
    if (url.endsWith('/login')) {
      const { username, password } = JSON.parse(String(init?.body));
      return username === 'david' && password === 'david123'
        ? json({ access_token: TOKEN, token_type: 'Bearer', expires_in: 900, scope: 'read:data' })
        : json({ error: 'invalid_credentials', message: 'Invalid username or password' }, 401);
    }
    if (url.endsWith('/logout')) return new Response(null, { status: 204 });
    if (!authorization) return json({ error: 'missing_token', message: 'An access token is required' }, 401);
    if (url.endsWith('/api/data')) {
      return json({
        user: { id: 'user-1', username: 'david' },
        items: [{ id: 1, title: 'Build the OAuth flow', done: true }],
      });
    }
    if (url.endsWith('/api/admin/stats')) {
      return json({ error: 'insufficient_scope', message: 'This resource requires the "admin" scope' }, 403);
    }
    return json({ error: 'not_found', message: 'Route not found' }, 404);
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

async function logIn(user: UserEvent, username: string, password: string) {
  await user.type(screen.getByLabelText('Username'), username);
  await user.type(screen.getByLabelText('Password'), password);
  await user.click(screen.getByRole('button', { name: 'Log in' }));
}

function region(name: string) {
  return within(screen.getByRole('region', { name }));
}

describe('App', () => {
  it('logs in, then sends the token to the service and shows the data', async () => {
    const user = userEvent.setup();
    const fetchMock = mockBackend();
    render(<App />);

    await logIn(user, 'david', 'david123');
    expect(await screen.findByRole('heading', { name: 'Signed in as david' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Get my data' }));

    expect(await region('Service response').findByText('Build the OAuth flow')).toBeInTheDocument();
    expect(region('Service response').getByText('200 OK')).toBeInTheDocument();
    const dataCall = fetchMock.mock.calls.find(([input]) => String(input).endsWith('/api/data'));
    expect(new Headers(dataCall?.[1]?.headers).get('Authorization')).toBe(`Bearer ${TOKEN}`);
  });

  it('shows the error of the auth server when the password is wrong', async () => {
    const user = userEvent.setup();
    mockBackend();
    render(<App />);

    await logIn(user, 'david', 'wrong');

    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid username or password');
    expect(screen.queryByRole('button', { name: 'Log out' })).not.toBeInTheDocument();
  });

  it('fills the form with a demo account', async () => {
    const user = userEvent.setup();
    mockBackend();
    render(<App />);

    await user.click(screen.getByRole('button', { name: /admin read:data admin/ }));

    expect(screen.getByLabelText('Username')).toHaveValue('admin');
    expect(screen.getByLabelText('Password')).toHaveValue('admin123');
  });

  it('shows 403 and explains it when david asks for the admin stats', async () => {
    const user = userEvent.setup();
    mockBackend();
    render(<App />);

    await logIn(user, 'david', 'david123');
    await user.click(await screen.findByRole('button', { name: 'Admin stats' }));

    const response = region('Service response');
    expect(await response.findByText('403 Forbidden')).toBeInTheDocument();
    expect(response.getByText('insufficient_scope')).toBeInTheDocument();
    expect(response.getByText(/missing the required scope/)).toBeInTheDocument();
  });

  it('can reuse the old token after logging out to show it was revoked', async () => {
    const user = userEvent.setup();
    mockBackend();
    render(<App />);
    expect(screen.getByRole('button', { name: 'Revoked token' })).toBeDisabled();

    await logIn(user, 'david', 'david123');
    await user.click(await screen.findByRole('button', { name: 'Log out' }));

    expect(await screen.findByRole('heading', { name: 'Log in' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Revoked token' })).toBeEnabled();
  });

  it('never shows the password in the network inspector', async () => {
    const user = userEvent.setup();
    mockBackend();
    render(<App />);

    await logIn(user, 'david', 'david123');
    const network = region('Network log');
    await user.click(await network.findByRole('button', { name: /POST \/login/ }));

    const details = screen.getByRole('region', { name: 'Network log' });
    expect(details).toHaveTextContent('••••••••');
    expect(details).not.toHaveTextContent('david123');
  });
});
