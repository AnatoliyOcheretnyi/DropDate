"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "../src/shared/state/auth";
import { webQueryClient } from "../src/shared/api/queryClient";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={webQueryClient}>
      <AuthProvider>{children}</AuthProvider>
    </QueryClientProvider>
  );
}
