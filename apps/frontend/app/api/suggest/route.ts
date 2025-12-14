import { NextRequest, NextResponse } from "next/server";

const DEFAULT_BACKEND_URL = "http://localhost:8080";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("query");
  const limit = searchParams.get("limit") || "5";

  if (!query || query.trim().length < 2) {
    return NextResponse.json({ message: "query is required" }, { status: 400 });
  }

  const backendBase = process.env.BACKEND_URL || DEFAULT_BACKEND_URL;
  const backendURL = new URL("/suggest", backendBase);
  backendURL.searchParams.set("query", query);
  backendURL.searchParams.set("limit", limit);

  try {
    const backendResponse = await fetch(backendURL, {
      headers: { accept: "application/json" },
      cache: "no-store"
    });

    const payload = await backendResponse
      .json()
      .catch(() => ({ message: "DropDate backend повернув не JSON" }));

    if (!backendResponse.ok) {
      return NextResponse.json(payload, { status: backendResponse.status });
    }

    return NextResponse.json(payload, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Не вдалося зʼєднатись із бекендом";
    return NextResponse.json({ message }, { status: 502 });
  }
}
