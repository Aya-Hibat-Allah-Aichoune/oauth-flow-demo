import { describe, expect, it } from 'vitest';
import { loginSteps, serviceSteps } from './flow';

describe('loginSteps', () => {
  it('marks steps 1 and 2 as done after a login', () => {
    expect(loginSteps(true)).toEqual(['ok', 'ok', 'idle', 'idle', 'idle']);
  });

  it('marks step 1 as failed when the login is rejected', () => {
    expect(loginSteps(false)).toEqual(['error', 'idle', 'idle', 'idle', 'idle']);
  });
});

describe('serviceSteps', () => {
  it.each([
    { status: 200, code: undefined, expected: ['ok', 'ok', 'ok'] },
    { status: 401, code: 'missing_token', expected: ['error', 'idle', 'idle'] },
    { status: 400, code: 'invalid_request', expected: ['error', 'idle', 'idle'] },
    { status: 0, code: 'network_error', expected: ['error', 'idle', 'idle'] },
    { status: 401, code: 'invalid_token', expected: ['ok', 'error', 'idle'] },
    { status: 503, code: 'auth_server_unavailable', expected: ['ok', 'error', 'idle'] },
    { status: 403, code: 'insufficient_scope', expected: ['ok', 'ok', 'error'] },
  ])('$status $code -> $expected', ({ status, code, expected }) => {
    expect(serviceSteps(status, code)).toEqual(expected);
  });
});
