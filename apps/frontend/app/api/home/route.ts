import { NextRequest } from "next/server";
import { proxyBackend } from "../../../src/shared/api/backendProxy";

export function GET(request: NextRequest) {
  return proxyBackend(request, "/home", {
    revalidate: 3600,
    forwardAuth: false,
  });
}
