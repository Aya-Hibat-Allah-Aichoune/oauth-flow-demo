import { Laptop, LoaderCircle, RotateCcw, Server, ShieldCheck, Check, X, type LucideIcon } from 'lucide-react';
import type { CSSProperties } from 'react';
import {
  FLOW_STEPS,
  NODES,
  STEP_DURATION_MS,
  usePlayback,
  visibleState,
  type FlowState,
  type NodeId,
  type Run,
  type VisibleState,
} from '../flow';
import { useElementSize } from '../hooks';

const POSITIONS: Record<NodeId, { x: number; y: number }> = {
  client: { x: 0, y: 50 },
  auth: { x: 100, y: 0 },
  service: { x: 100, y: 100 },
};

const ICONS: Record<NodeId, LucideIcon> = { client: Laptop, auth: ShieldCheck, service: Server };

const EDGES: { a: NodeId; b: NodeId; steps: number[] }[] = [
  { a: 'client', b: 'auth', steps: [0, 1] },
  { a: 'client', b: 'service', steps: [2, 4] },
  { a: 'service', b: 'auth', steps: [3] },
];

const STATE_TEXT: Record<VisibleState, string> = {
  idle: 'Waiting',
  active: 'In progress',
  ok: 'Done',
  error: 'Failed',
};

export interface FlowVisualizerProps {
  flow: FlowState;
  run: Run | null;
  onReplay: () => void;
}

export function FlowVisualizer({ flow, run, onReplay }: FlowVisualizerProps) {
  const activeStep = usePlayback(run);
  const [stageRef, stage] = useElementSize<HTMLDivElement>();
  const states = FLOW_STEPS.map((_, index) => visibleState(index, flow, run, activeStep));
  const current = activeStep !== null ? FLOW_STEPS[activeStep] : undefined;

  const captionStep = activeStep ?? run?.steps.at(-1) ?? null;
  const captionState = captionStep !== null ? states[captionStep] : undefined;

  function edgeState(edge: (typeof EDGES)[number]): string {
    if (current && edge.steps.includes(activeStep!)) {
      return current.from === edge.a ? 'active' : 'active reverse';
    }
    const edgeStates = edge.steps.map((step) => states[step]);
    if (edgeStates.includes('error')) return 'error';
    if (edgeStates.includes('ok')) return 'ok';
    return 'idle';
  }

  function nodeIsActive(node: NodeId): boolean {
    return !!current && (current.from === node || current.to === node);
  }

  const point = (node: NodeId) => ({
    x: (POSITIONS[node].x / 100) * stage.width,
    y: (POSITIONS[node].y / 100) * stage.height,
  });

  return (
    <section className="card viz-card" aria-labelledby="flow-title">
      <div className="card-header">
        <div>
          <h2 id="flow-title">Request flow</h2>
          <p className="card-subtitle">Last exchange between the three nodes.</p>
        </div>
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={onReplay}
          disabled={!run || run.steps.length === 0 || activeStep !== null}
        >
          <RotateCcw size={15} aria-hidden="true" />
          Replay
        </button>
      </div>

      <div className="viz" aria-hidden="true">
        <div className="viz-stage" ref={stageRef}>
          {stage.width > 0 && (
            <svg className="viz-lines" width={stage.width} height={stage.height}>
              {EDGES.map((edge) => {
                const from = point(edge.a);
                const to = point(edge.b);
                return (
                  <line
                    key={`${edge.a}-${edge.b}`}
                    className={`viz-edge ${edgeState(edge)}`}
                    x1={from.x}
                    y1={from.y}
                    x2={to.x}
                    y2={to.y}
                  />
                );
              })}
            </svg>
          )}

          {EDGES.map((edge) => (
            <span
              key={`label-${edge.a}-${edge.b}`}
              className="viz-edge-label"
              style={{
                left: `${(POSITIONS[edge.a].x + POSITIONS[edge.b].x) / 2}%`,
                top: `${(POSITIONS[edge.a].y + POSITIONS[edge.b].y) / 2}%`,
              }}
            >
              {edge.steps.map((step) => step + 1).join(' · ')}
            </span>
          ))}

          {(Object.keys(NODES) as NodeId[]).map((node) => {
            const Icon = ICONS[node];
            return (
              <div
                key={node}
                className={`viz-node ${nodeIsActive(node) ? 'is-active' : ''}`}
                style={{ left: `${POSITIONS[node].x}%`, top: `${POSITIONS[node].y}%` }}
              >
                <span className="viz-node-icon">
                  <Icon size={24} strokeWidth={1.75} />
                </span>
                <span className="viz-node-label">
                  <strong>{NODES[node].name}</strong>
                  <span>{NODES[node].detail}</span>
                </span>
              </div>
            );
          })}

          {current && activeStep !== null && (
            <span
              key={`${run?.id}-${activeStep}`}
              className={`viz-packet ${flow[activeStep] === 'error' ? 'is-error' : ''}`}
              style={
                {
                  '--x1': `${POSITIONS[current.from].x}%`,
                  '--y1': `${POSITIONS[current.from].y}%`,
                  '--x2': `${POSITIONS[current.to].x}%`,
                  '--y2': `${POSITIONS[current.to].y}%`,
                  '--travel': `${STEP_DURATION_MS - 250}ms`,
                } as CSSProperties
              }
            >
              {current.packet}
            </span>
          )}
        </div>
      </div>

      <ol className="stepper">
        {FLOW_STEPS.map((step, index) => {
          const state = states[index] ?? 'idle';
          return (
            <li key={step.title} className={`stepper-item is-${state}`}>
              <span className="stepper-dot">
                <StepIcon state={state} number={index + 1} />
              </span>
              <span className="stepper-text">
                <span className="stepper-title">{step.title}</span>
                <span className="stepper-route">
                  {NODES[step.from].name} → {NODES[step.to].name}
                </span>
              </span>
              <span className="visually-hidden">
                Step {index + 1}: {STATE_TEXT[state]}. {step.detail}
              </span>
            </li>
          );
        })}
      </ol>

      <p className={`viz-caption is-${captionState ?? 'idle'}`} aria-live="polite">
        {captionStep === null ? (
          'Log in to start the flow.'
        ) : (
          <>
            <span className="viz-caption-step">Step {captionStep + 1}</span>
            {FLOW_STEPS[captionStep]?.detail}
          </>
        )}
      </p>
    </section>
  );
}

function StepIcon({ state, number }: { state: VisibleState; number: number }) {
  if (state === 'active') return <LoaderCircle className="spin" size={14} aria-hidden="true" />;
  if (state === 'ok') return <Check size={14} strokeWidth={3} aria-hidden="true" />;
  if (state === 'error') return <X size={14} strokeWidth={3} aria-hidden="true" />;
  return <>{number}</>;
}
