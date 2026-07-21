import { NextRequest, NextResponse } from "next/server";

const fallbackBackend = "http://localhost:8080";

export async function GET(request: NextRequest) {
  try {
    const url = new URL(`/episodes/metadata${request.nextUrl.search}`, process.env.BACKEND_URL || fallbackBackend);
    const response = await fetch(url, { headers: { authorization: request.headers.get("authorization") || "" }, cache: "no-store" });
    return NextResponse.json(await response.json(), { status: response.status });
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "offline" }, { status: 502 });
  }
}
