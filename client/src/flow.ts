import { useEffect, useState } from 'react';
import { usePrefersReducedMotion } from './hooks';

export type StepState = 'idle' | 'ok' | 'error';

export type FlowState = [StepState, StepState, StepState, StepState, StepState];

export type NodeId = 'client' | 'auth' | 'service';

export const NODES: Record<NodeId, { name: string; detail: string }> = {
  client: { name: 'Client', detail: 'React · :5173' },
  auth: { name: 'Auth server', detail: 'Node · :4000' },
  service: { name: 'Service', detail: 'Node · :4001' },
};

export interface FlowStep {
  from: NodeId;
  to: NodeId;
  title: string;
  detail: string;
  packet: string;
}

export const FLOW_STEPS: readonly FlowStep[] = [
  {
    from: 'client',
    to: 'auth',
    title: 'Login',
    detail: 'POST /login with username and password',
    packet: 'credentials',
  },
  {
    from: 'auth',
    to: 'client',
    title: 'JWT issued',
    detail: 'The auth server signs and returns an access token',
    packet: 'JWT',
  },
  {
    from: 'client',
    to: 'service',
    title: 'Data request',
    detail: 'GET /api/data with "Authorization: Bearer <JWT>"',
    packet: 'Bearer JWT',
  },
  {
    from: 'service',
    to: 'auth',
    title: 'Token check',
    detail: 'POST /introspect: is this token valid?',
    packet: 'introspect',
  },
  {
    from: 'service',
    to: 'client',
    title: 'Data returned',
    detail: 'The service answers with the JSON data',
    packet: 'JSON',
  },
];

export const IDLE_FLOW: FlowState = ['idle', 'idle', 'idle', 'idle', 'idle'];

export function loginSteps(ok: boolean): FlowState {
  return ok ? ['ok', 'ok', 'idle', 'idle', 'idle'] : ['error', 'idle', 'idle', 'idle', 'idle'];
}

export function serviceSteps(status: number, errorCode?: string): [StepState, StepState, StepState] {
  if (status >= 200 && status < 300) return ['ok', 'ok', 'ok'];

  if (status === 0 || errorCode === 'missing_token' || errorCode === 'invalid_request') {
    return ['error', 'idle', 'idle'];
  }

  if (errorCode === 'insufficient_scope') return ['ok', 'ok', 'error'];

  return ['ok', 'error', 'idle'];
}

export interface Run {
  id: number;
  steps: number[];
}

export const STEP_DURATION_MS = 900;

export function usePlayback(run: Run | null): number | null {
  const reducedMotion = usePrefersReducedMotion();
  const [cursor, setCursor] = useState<{ runId: number; position: number } | null>(null);

  useEffect(() => {
    if (!run || reducedMotion || run.steps.length === 0) return;
    let position = 0;
    setCursor({ runId: run.id, position });
    const timer = window.setInterval(() => {
      position += 1;
      if (position >= run.steps.length) {
        window.clearInterval(timer);
        setCursor(null);
      } else {
        setCursor({ runId: run.id, position });
      }
    }, STEP_DURATION_MS);
    return () => window.clearInterval(timer);
  }, [run, reducedMotion]);

  if (!run || !cursor || cursor.runId !== run.id) return null;
  return run.steps[cursor.position] ?? null;
}

export type VisibleState = StepState | 'active';

export function visibleState(index: number, flow: FlowState, run: Run | null, activeStep: number | null): VisibleState {
  if (activeStep === null || !run) return flow[index] ?? 'idle';
  const position = run.steps.indexOf(index);
  const activePosition = run.steps.indexOf(activeStep);
  if (position === -1 || position < activePosition) return flow[index] ?? 'idle';
  return position === activePosition ? 'active' : 'idle';
}
