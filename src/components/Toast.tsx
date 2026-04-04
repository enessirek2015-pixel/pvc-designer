import { useEffect, useRef, useState } from "react";

export type ToastKind = "info" | "success" | "warning" | "error";

export interface ToastMessage {
  id: string;
  text: string;
  kind: ToastKind;
  durationMs?: number;
}

interface ToastItemProps {
  toast: ToastMessage;
  onDismiss: (id: string) => void;
}

function ToastItem({ toast, onDismiss }: ToastItemProps) {
  const [exiting, setExiting] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const duration = toast.durationMs ?? 3200;
    timerRef.current = setTimeout(() => {
      setExiting(true);
      setTimeout(() => onDismiss(toast.id), 280);
    }, duration);
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [toast.id, toast.durationMs, onDismiss]);

  const icon = {
    info: "ℹ",
    success: "✓",
    warning: "⚠",
    error: "✕"
  }[toast.kind];

  return (
    <div
      className={`toast-item toast-${toast.kind} ${exiting ? "toast-exit" : "toast-enter"}`}
      onClick={() => {
        setExiting(true);
        setTimeout(() => onDismiss(toast.id), 280);
      }}
    >
      <span className="toast-icon">{icon}</span>
      <span className="toast-text">{toast.text}</span>
    </div>
  );
}

interface ToastContainerProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  if (!toasts.length) {
    return null;
  }

  return (
    <div className="toast-container">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

let toastCounter = 0;

export function useToast() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  function push(text: string, kind: ToastKind = "info", durationMs?: number) {
    toastCounter += 1;
    const id = `toast-${toastCounter}`;
    setToasts((prev) => [...prev.slice(-4), { id, text, kind, durationMs }]);
  }

  function dismiss(id: string) {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }

  return { toasts, push, dismiss };
}
