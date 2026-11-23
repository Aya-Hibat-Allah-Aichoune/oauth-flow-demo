const STATUS_TEXT: Record<number, string> = {
  0: 'Network error',
  200: 'OK',
  204: 'No Content',
  400: 'Bad Request',
  401: 'Unauthorized',
  403: 'Forbidden',
  404: 'Not Found',
  413: 'Payload Too Large',
  429: 'Too Many Requests',
  500: 'Internal Server Error',
  502: 'Bad Gateway',
  503: 'Service Unavailable',
};

export interface StatusBadgeProps {
  status: number;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const tone = status >= 200 && status < 300 ? 'ok' : status >= 400 && status < 500 ? 'warn' : 'error';
  const text = STATUS_TEXT[status];
  return <span className={`badge badge-${tone}`}>{status === 0 ? text : text ? `${status} ${text}` : status}</span>;
}
