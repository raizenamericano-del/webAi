"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, XCircle, Info, AlertTriangle, X } from "lucide-react";

type ToastType = "success" | "error" | "info" | "warn";
type Toast = { id: number; type: ToastType; title: string; desc?: string };

const ToastCtx = React.createContext<{
  toast: (t: Omit<Toast, "id">) => void;
  success: (title: string, desc?: string) => void;
  error: (title: string, desc?: string) => void;
  info: (title: string, desc?: string) => void;
}>({ toast: () => {}, success: () => {}, error: () => {}, info: () => {} });

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = React.useState<Toast[]>([]);

  const push = React.useCallback((t: Omit<Toast, "id">) => {
    const id = Date.now() + Math.random();
    setItems((s) => [...s, { ...t, id }]);
    setTimeout(() => setItems((s) => s.filter((x) => x.id !== id)), 5000);
  }, []);

  const value = React.useMemo(
    () => ({
      toast: push,
      success: (title: string, desc?: string) => push({ type: "success", title, desc }),
      error: (title: string, desc?: string) => push({ type: "error", title, desc }),
      info: (title: string, desc?: string) => push({ type: "info", title, desc }),
    }),
    [push],
  );

  const icons: Record<ToastType, React.ReactNode> = {
    success: <CheckCircle2 className="h-5 w-5 text-neon-lime" />,
    error: <XCircle className="h-5 w-5 text-destructive" />,
    info: <Info className="h-5 w-5 text-neon-cyan" />,
    warn: <AlertTriangle className="h-5 w-5 text-amber-400" />,
  };

  return (
    <ToastCtx.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-[999] flex w-[min(92vw,380px)] flex-col gap-2">
        <AnimatePresence>
          {items.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 20, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: 40, scale: 0.96 }}
              className="pointer-events-auto flex gap-3 rounded-xl border border-border bg-card/95 p-3 shadow-2xl backdrop-blur"
            >
              {icons[t.type]}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">{t.title}</p>
                {t.desc && <p className="mt-0.5 break-words text-xs text-muted-foreground">{t.desc}</p>}
              </div>
              <button
                onClick={() => setItems((s) => s.filter((x) => x.id !== t.id))}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastCtx.Provider>
  );
}

export const useToast = () => React.useContext(ToastCtx);
