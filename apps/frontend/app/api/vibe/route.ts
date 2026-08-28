import { NextRequest } from "next/server";
import { proxyBackend } from "../../../src/shared/api/backendProxy";

// Interpretation can take a couple of seconds (model + two TMDB legs), so this
// route gets a longer ceiling than the default proxy timeout.
export function POST(request: NextRequest) {
  return proxyBackend(request, "/vibe", { timeoutMs: 25_000 });
}
