import { NextRequest } from "next/server";
import { proxyBackend } from "../../../../src/shared/api/backendProxy";

export function POST(request: NextRequest) {
  return proxyBackend(request, "/recommendations/feedback");
}

export function GET(request: NextRequest) {
  return proxyBackend(request, "/recommendations/feedback");
}
