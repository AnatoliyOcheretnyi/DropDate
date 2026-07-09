"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type ToastTone = "success" | "warning";

export type Toast = {
  id: string;
  message: string;
  tone?: ToastTone;
  undo?: () => void;
};

const TOAST_TTL_MS = 2600;

// Transient confirmations with an optional undo, auto-dismissed after a beat.
export function useToasts() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timers = useRef(new Map<string, number>());

  const dismissToast = useCallback((id: string) => {
    const timer = timers.current.get(id);
    if (timer !== undefined) {
      window.clearTimeout(timer);
      timers.current.delete(id);
    }
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const pushToast = useCallback(
    (message: string, tone: ToastTone = "success", undo?: () => void) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      setToasts((prev) => [...prev, { id, message, tone, undo }]);
      const timer = window.setTimeout(() => {
        timers.current.delete(id);
        setToasts((prev) => prev.filter((toast) => toast.id !== id));
      }, TOAST_TTL_MS);
      timers.current.set(id, timer);
    },
    []
  );

  useEffect(() => {
    const pending = timers.current;
    return () => {
      pending.forEach((timer) => window.clearTimeout(timer));
      pending.clear();
    };
  }, []);

  return { toasts, pushToast, dismissToast };
}
