import { NextRequest } from "next/server";
import { proxyBackend } from "../../../../src/shared/api/backendProxy";

export function POST(request: NextRequest) {
  return proxyBackend(request, "/auth/login", {
    forwardAuth: false,
    forwardQuery: false,
    forwardSetCookie: true,
  });
}
