import { NextRequest, NextResponse } from "next/server";
import { proxyBackend } from "../../../src/shared/api/backendProxy";

export function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  if (!searchParams.get("tmdbId") || !searchParams.get("mediaType")) {
    return NextResponse.json(
      { message: "tmdbId and mediaType are required" },
      { status: 400 }
    );
  }
  return proxyBackend(request, "/details", {
    revalidate: 600,
    forwardAuth: false,
  });
}
