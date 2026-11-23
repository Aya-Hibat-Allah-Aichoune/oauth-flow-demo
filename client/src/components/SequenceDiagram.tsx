import { useEffect, useRef, type CSSProperties } from 'react';
import { AUTH_URL, SERVICE_URL } from '../api';
import { useHealth, type Health } from '../hooks';
import { NODES, type Message, type NodeId, type Side, type Trace } from '../trace';

export interface Selection {
  traceId: number;
  side: Side;
}

const LANES: NodeId[] = ['client', 'auth', 'service'];

const CENTER: Record<NodeId, number> = { client: 100 / 6, auth: 50, service: 500 / 6 };

const HEALTH_TEXT: Record<Health, string> = { checking: 'checking…', online: 'online', offline: 'offline' };

export interface SequenceDiagramProps {
  traces: Trace[];
  selection: Selection | null;
  onSelect: (selection: Selection) => void;
  onClear: () => void;
}

export function SequenceDiagram({ traces, selection, onSelect, onClear }: SequenceDiagramProps) {
  const authHealth = useHealth(AUTH_URL);
  const serviceHealth = useHealth(SERVICE_URL);
  const health: Record<NodeId, Health> = { client: 'online', auth: authHealth, service: serviceHealth };
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = scroller.current;
    if (element) element.scrollTop = element.scrollHeight;
  }, [traces.length]);

  return (
    <section className="block diagram" aria-labelledby="diagram-title">
      <div className="block-head">
        <span className="block-number" aria-hidden="true">
          3
        </span>
        <h2 id="diagram-title">Sequence diagram</h2>
        <button type="button" className="text-button" onClick={onClear} disabled={traces.length === 0}>
          Clear
        </button>
      </div>

      <div className="lanes">
        {LANES.map((id) => (
          <div key={id} className="lane-head">
            <span className="lane-name">{NODES[id].name}</span>
            <span className="lane-detail">{NODES[id].detail}</span>
            <span className={`lane-status is-${health[id]}`}>
              {id === 'client' ? 'this page' : HEALTH_TEXT[health[id]]}
            </span>
          </div>
        ))}
      </div>

      <div className="sequence" ref={scroller}>
        <div className="sequence-inner">
          <div className="lifelines" aria-hidden="true">
            {LANES.map((id) => (
              <span key={id} style={{ left: `${CENTER[id]}%` }} />
            ))}
          </div>

          {traces.length === 0 ? (
            <p className="sequence-empty">
              Nothing has been sent yet. Log in on the left and the first arrows will show up here.
            </p>
          ) : (
            traces.map((trace) => (
              <div key={trace.id} className={`frame ${selection?.traceId === trace.id ? 'is-current' : ''}`}>
                <div className="frame-head">
                  <span className="frame-tag">
                    <span className="frame-id">#{trace.id}</span> {trace.title}
                  </span>
                  <span className="frame-meta">
                    {new Date(trace.at).toLocaleTimeString()} · {trace.result.exchange.durationMs} ms
                  </span>
                </div>
                <p className="frame-note">{trace.note}</p>
                {trace.messages.map((message, index) => (
                  <Arrow
                    key={index}
                    message={message}
                    step={index}
                    selected={selection?.traceId === trace.id && selection.side === message.side && !message.inferred}
                    onSelect={() => onSelect({ traceId: trace.id, side: message.side })}
                  />
                ))}
              </div>
            ))
          )}
        </div>
      </div>

      <ul className="legend" aria-label="Legend">
        <li>
          <span className="legend-key is-request" aria-hidden="true" /> request
        </li>
        <li>
          <span className="legend-key is-response" aria-hidden="true" /> response
        </li>
        <li>
          <span className="legend-key is-inferred" aria-hidden="true" /> server to server, inferred from the answer
        </li>
      </ul>
    </section>
  );
}

interface ArrowProps {
  message: Message;
  step: number;
  selected: boolean;
  onSelect: () => void;
}

function Arrow({ message, step, selected, onSelect }: ArrowProps) {
  const from = CENTER[message.from];
  const to = CENTER[message.to];
  const style = {
    '--left': `${Math.min(from, to)}%`,
    '--width': `${Math.abs(to - from)}%`,
    '--step': step,
  } as CSSProperties;
  const className = [
    'arrow',
    `is-${message.side}`,
    `tone-${message.tone}`,
    to > from ? 'points-right' : 'points-left',
    message.inferred ? 'is-inferred' : '',
    selected ? 'is-selected' : '',
  ]
    .filter(Boolean)
    .join(' ');

  const content = (
    <>
      <span className="arrow-label">
        {message.label}
        {message.inferred && <span className="arrow-tag">inferred</span>}
      </span>
      <span className="arrow-line" aria-hidden="true" />
    </>
  );

  if (message.inferred) {
    return (
      <div className={className} style={style}>
        {content}
      </div>
    );
  }

  return (
    <button
      type="button"
      className={className}
      style={style}
      aria-pressed={selected}
      aria-label={`${message.label}, from ${NODES[message.from].name} to ${NODES[message.to].name}`}
      onClick={onSelect}
    >
      {content}
    </button>
  );
}
