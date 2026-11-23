import { CircleCheck, CircleExclamationPoint, Info, X } from 'lucide-react';
import { useCallback, useRef, useState, type ReactNode } from 'react';
import { ToastContext, type ToastInput } from '../toast';

interface Toast extends ToastInput {
  id: number;
}

const DURATION_MS = 3500;
const ICONS = { success: CircleCheck, error: CircleExclamationPoint, info: Info };

export interface ToastProviderProps {
  children: ReactNode;
}

export function ToastProvider({ children }: ToastProviderProps) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const show = useCallback(
    (toast: ToastInput) => {
      const id = nextId.current++;
      setToasts((current) => [...current, { ...toast, id }].slice(-3));
      window.setTimeout(() => dismiss(id), DURATION_MS);
    },
    [dismiss],
  );

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {toasts.map((toast) => {
          const Icon = ICONS[toast.tone];
          return (
            <div key={toast.id} className={`toast toast-${toast.tone}`}>
              <Icon className="toast-icon" size={18} aria-hidden="true" />
              <div className="toast-text">
                <strong>{toast.title}</strong>
                {toast.description && <span>{toast.description}</span>}
              </div>
              <button type="button" className="icon-button" aria-label="Dismiss" onClick={() => dismiss(toast.id)}>
                <X size={16} aria-hidden="true" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
