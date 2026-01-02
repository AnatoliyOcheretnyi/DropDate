"use client";

import { AuthProvider } from "./state/auth";

export function Providers({ children }: { children: React.ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}
