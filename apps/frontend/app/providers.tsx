"use client";

import { Suspense } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "../src/shared/state/auth";
import { webQueryClient } from "../src/shared/api/queryClient";
import { ColdStartOverlay } from "../src/widgets/ColdStartOverlay";
import { AchievementUnlockOverlay } from "../src/widgets/AchievementUnlockOverlay";
import { AnalyticsReporter } from "../src/shared/ui/AnalyticsReporter";
import { SavedSyncNotice } from "../src/features/saved/components/SavedSyncNotice";
import { BackToTop } from "../src/shared/ui/BackToTop";
import { OfflineNotice } from "../src/shared/ui/OfflineNotice";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={webQueryClient}>
      <Suspense fallback={null}>
        <AnalyticsReporter />
      </Suspense>
      <OfflineNotice />
      <BackToTop />
      <AuthProvider>
        {children}
        <SavedSyncNotice />
      </AuthProvider>
      <ColdStartOverlay />
      <AchievementUnlockOverlay />
    </QueryClientProvider>
  );
}
