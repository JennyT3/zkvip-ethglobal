'use client';

import { useEffect, useState } from 'react';
import clsx from 'clsx';

type ToastType = 'success' | 'error' | 'info';

type Toast = {
  id: string;
  message: string;
  type: ToastType;
};

let toastId = 0;
const toasts: Toast[] = [];
const listeners: Array<() => void> = [];

export const showToast = (message: string, type: ToastType = 'info') => {
  const id = `toast-${toastId++}`;
  toasts.push({ id, message, type });
  listeners.forEach((listener) => listener());
  
  setTimeout(() => {
    const index = toasts.findIndex((t) => t.id === id);
    if (index !== -1) {
      toasts.splice(index, 1);
      listeners.forEach((listener) => listener());
    }
  }, 3000);
};

export function ToastContainer() {
  const [toastList, setToastList] = useState<Toast[]>([]);

  useEffect(() => {
    const update = () => {
      setToastList([...toasts]);
    };
    listeners.push(update);
    update();

    return () => {
      const index = listeners.indexOf(update);
      if (index !== -1) {
        listeners.splice(index, 1);
      }
    };
  }, []);

  if (toastList.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2">
      {toastList.map((toast) => (
        <div
          key={toast.id}
          className={clsx(
            'min-w-[300px] max-w-md rounded-xl px-4 py-3 shadow-2xl backdrop-blur-sm animate-in slide-in-from-right duration-300',
            toast.type === 'success' &&
              'bg-emerald-500/95 text-white border border-emerald-400',
            toast.type === 'error' &&
              'bg-red-500/95 text-white border border-red-400',
            toast.type === 'info' &&
              'bg-slate-900/95 text-white border border-slate-700',
          )}
        >
          <div className="flex items-center gap-3">
            {toast.type === 'success' && (
              <svg
                className="w-5 h-5 shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            )}
            {toast.type === 'error' && (
              <svg
                className="w-5 h-5 shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            )}
            {toast.type === 'info' && (
              <svg
                className="w-5 h-5 shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            )}
            <p className="text-sm font-semibold flex-1">{toast.message}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

