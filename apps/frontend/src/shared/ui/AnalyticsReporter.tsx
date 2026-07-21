"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { track } from "../lib/analytics";

export function AnalyticsReporter() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    const query = searchParams.toString();
    track("page_view", { path: query ? `${pathname}?${query}` : pathname });
  }, [pathname, searchParams]);

  return null;
}
