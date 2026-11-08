import { NextRequest } from "next/server";
import { proxyBackend } from "../../../../src/shared/api/backendProxy";

export function GET(request: NextRequest) {
  return proxyBackend(request, "/home/collection", { timeoutMs: 30_000 });
}
