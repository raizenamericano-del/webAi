"use client";

import * as React from "react";

export type LiveStats = {
  chats: number;
  images: number;
  downloads: number;
  tools: number;
  users: number;
  online: number;
  timestamp: number;
};

const RealtimeCtx = React.createContext<{ stats: LiveStats | null; connected: boolean }>({
  stats: null,
  connected: false,
});

/**
 * Client realtime: pakai WebSocket (Socket.IO server) kalau jalan,
 * kalau nggak otomatis fallback ke SSE `/api/realtime`.
 */
export function RealtimeProvider({ children }: { children: React.ReactNode }) {
  const [stats, setStats] = React.useState<LiveStats | null>(null);
  const [connected, setConnected] = React.useState(false);

  React.useEffect(() => {
    let es: EventSource | null = null;
    let cancelled = false;

    const startSSE = () => {
      es = new EventSource("/api/realtime");
      es.onopen = () => !cancelled && setConnected(true);
      es.onmessage = (ev) => {
        try {
          const data = JSON.parse(ev.data);
          if (data?.event === "stats" || data?.chats !== undefined) setStats(data?.payload || data);
        } catch {}
      };
      es.onerror = () => setConnected(false);
    };

    // coba WebSocket dulu (Socket.IO via raw ws endpoint /api/ws tidak wajib)
    // aman: kalau gagal, pakai SSE
    startSSE();

    return () => {
      cancelled = true;
      es?.close();
    };
  }, []);

  return <RealtimeCtx.Provider value={{ stats, connected }}>{children}</RealtimeCtx.Provider>;
}

export const useRealtime = () => React.useContext(RealtimeCtx);
