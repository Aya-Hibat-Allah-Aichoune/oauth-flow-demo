import { createContext, useContext } from 'react';

export interface ToastInput {
  tone: 'success' | 'error' | 'info';
  title: string;
  description?: string;
}

export type ShowToast = (toast: ToastInput) => void;

export const ToastContext = createContext<ShowToast>(() => {});

export function useToast(): ShowToast {
  return useContext(ToastContext);
}
