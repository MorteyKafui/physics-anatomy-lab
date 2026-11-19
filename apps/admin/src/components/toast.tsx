"use client";

// The undo toast (D30): says what happened, offers Undo when the change can be undone.
import { Check } from "@pa/ui/icons";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

interface Toast {
  text: string;
  undo?: () => void;
  failed?: boolean;
}

const ToastContext = createContext<(toast: Toast) => void>(() => {});

export const useToast = () => useContext(ToastContext);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<Toast | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const show = useCallback((next: Toast) => {
    clearTimeout(timer.current);
    setToast(next);
    timer.current = setTimeout(() => setToast(null), 6000);
  }, []);
  useEffect(() => () => clearTimeout(timer.current), []);
  return (
    <ToastContext.Provider value={show}>
      {children}
      <div role="status" aria-live="polite">
        {toast && (
          <div className="ad-toast">
            <span
              style={{
                width: 18,
                height: 18,
                borderRadius: "var(--pa-round)",
                background: toast.failed ? "var(--pa-danger)" : "var(--pa-ok)",
                flex: "0 0 auto",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {toast.failed ? (
                <span aria-hidden="true" style={{ font: "700 12px var(--font-geist)" }}>
                  !
                </span>
              ) : (
                <Check size={11} strokeWidth={3.5} aria-hidden="true" />
              )}
            </span>
            <span style={{ flex: 1, fontSize: 13 }}>{toast.text}</span>
            {toast.undo && (
              <button
                className="ad-f"
                type="button"
                onClick={() => {
                  const undo = toast.undo;
                  setToast(null);
                  undo?.();
                }}
                style={{
                  height: 26,
                  padding: "0 10px",
                  background: "var(--pa-ink-950)",
                  color: "var(--pa-text)",
                  border: 0,
                  font: "600 12px var(--font-geist), sans-serif",
                  cursor: "pointer",
                }}
              >
                Undo
              </button>
            )}
          </div>
        )}
      </div>
    </ToastContext.Provider>
  );
}
