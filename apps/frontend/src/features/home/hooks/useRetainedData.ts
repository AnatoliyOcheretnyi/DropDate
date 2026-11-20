"use client";

import { useEffect, useRef } from "react";

/** Keep the last successful result through a key change or a failed refresh. */
export function useRetainedData<T>(data: T | undefined, scope: string) {
  const previous = useRef<{ scope: string; data: T }>();
  useEffect(() => {
    if (data !== undefined) previous.current = { scope, data };
    else if (previous.current?.scope !== scope) previous.current = undefined;
  }, [data, scope]);
  return (
    data ??
    (previous.current?.scope === scope ? previous.current.data : undefined)
  );
}
