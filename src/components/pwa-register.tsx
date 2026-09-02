"use client";

import * as React from "react";

/** Daftarkan service worker (PWA) + tombol install. */
export function PWARegister() {
  const [ready, setReady] = React.useState<any>(null);

  React.useEffect(() => {
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
    const handler = (e: any) => {
      e.preventDefault();
      setReady(e);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  if (!ready) return null;

  return (
    <button
      onClick={async () => {
        ready.prompt();
        const res = await ready.userChoice;
        if (res.outcome === "accepted") setReady(null);
      }}
      className="btn-neon fixed bottom-20 left-4 z-50 text-xs md:bottom-4"
    >
      Install App
    </button>
  );
}
