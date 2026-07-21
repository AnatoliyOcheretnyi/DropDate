import { NextRequest } from "next/server";
import { proxyBackend } from "../../../../src/shared/api/backendProxy";

export function GET(request: NextRequest) {
  return proxyBackend(request, "/recommendations/daily");
}

export function POST(request: NextRequest) {
  return proxyBackend(request, "/recommendations/daily");
}
