import { Fragment, type ReactNode } from 'react';

export interface JsonViewProps {
  value: unknown;
}

export function JsonView({ value }: JsonViewProps) {
  return (
    <pre className="json">
      <code>{value === undefined ? <span className="json-null">(empty)</span> : renderValue(value, '')}</code>
    </pre>
  );
}

function renderValue(value: unknown, indent: string): ReactNode {
  if (value === null) return <span className="json-null">null</span>;
  if (typeof value === 'string') return <span className="json-string">{JSON.stringify(value)}</span>;
  if (typeof value === 'number') return <span className="json-number">{value}</span>;
  if (typeof value === 'boolean') return <span className="json-boolean">{String(value)}</span>;

  const inner = `${indent}  `;
  if (Array.isArray(value)) {
    if (value.length === 0) return '[]';
    return (
      <>
        {'[\n'}
        {value.map((item, index) => (
          <Fragment key={index}>
            {inner}
            {renderValue(item, inner)}
            {index < value.length - 1 ? ',\n' : '\n'}
          </Fragment>
        ))}
        {`${indent}]`}
      </>
    );
  }

  if (typeof value === 'object') {
    const entries = Object.entries(value);
    if (entries.length === 0) return '{}';
    return (
      <>
        {'{\n'}
        {entries.map(([key, item], index) => (
          <Fragment key={key}>
            {inner}
            <span className="json-key">{JSON.stringify(key)}</span>
            {': '}
            {renderValue(item, inner)}
            {index < entries.length - 1 ? ',\n' : '\n'}
          </Fragment>
        ))}
        {`${indent}}`}
      </>
    );
  }

  return String(value);
}
