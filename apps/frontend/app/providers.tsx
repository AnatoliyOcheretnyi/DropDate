"use client";

import { AuthProvider } from "../src/shared/state/auth";

export function Providers({ children }: { children: React.ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}
