"use client";

import type { Toast } from "../hooks/useToasts";

type Props = {
  toasts: Toast[];
  onDismiss: (id: string) => void;
};

export function ToastStack({ toasts, onDismiss }: Props) {
  if (toasts.length === 0) {
    return null;
  }

  return (
    <div className="toast-stack" role="status" aria-live="polite">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`toast${toast.tone ? ` toast--${toast.tone}` : ""}`}
        >
          <span className="toast__msg">{toast.message}</span>
          {toast.undo ? (
            <button
              type="button"
              className="toast__undo"
              onClick={() => {
                toast.undo?.();
                onDismiss(toast.id);
              }}
            >
              Скасувати
            </button>
          ) : null}
          <span className="toast__bar" aria-hidden="true" />
        </div>
      ))}
    </div>
  );
}
