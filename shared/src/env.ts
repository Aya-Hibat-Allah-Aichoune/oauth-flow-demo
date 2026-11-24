export interface IntRange {
  min: number;
  max?: number;
}

export function requireInt(name: string, raw: string | undefined, fallback: number, range: IntRange): number {
  const provided = raw !== undefined;
  const source = provided ? raw : String(fallback);
  const value = Number(source);

  if (source.trim() === '' || !Number.isInteger(value)) {
    throw new Error(
      `${name} must be an integer${provided ? ` (got ${JSON.stringify(raw)})` : ''}. Example: ${fallback}`,
    );
  }
  if (value < range.min) {
    throw new Error(`${name} must be >= ${range.min} (got ${value}).`);
  }
  if (range.max !== undefined && value > range.max) {
    throw new Error(`${name} must be <= ${range.max} (got ${value}).`);
  }
  return value;
}

export function requirePort(name: string, raw: string | undefined, fallback: number): number {
  return requireInt(name, raw, fallback, { min: 1, max: 65_535 });
}
