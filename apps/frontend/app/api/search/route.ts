import { NextRequest, NextResponse } from "next/server";
import { proxyBackend } from "../../../src/shared/api/backendProxy";

export function GET(request: NextRequest) {
  if (!new URL(request.url).searchParams.get("query")) {
    return NextResponse.json({ message: "query is required" }, { status: 400 });
  }
  return proxyBackend(request, "/search", { forwardAuth: false });
}
