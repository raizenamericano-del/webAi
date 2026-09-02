"use client";

import * as React from "react";
import { SessionProvider } from "next-auth/react";
import { ThemeProvider } from "./theme-provider";
import { ToastProvider } from "./toast";
import { RealtimeProvider } from "./realtime-provider";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider refetchOnWindowFocus={false}>
      <ThemeProvider>
        <ToastProvider>
          <RealtimeProvider>{children}</RealtimeProvider>
        </ToastProvider>
      </ThemeProvider>
    </SessionProvider>
  );
}
