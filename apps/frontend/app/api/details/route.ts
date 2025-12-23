import { NextRequest, NextResponse } from "next/server";

const DEFAULT_BACKEND_URL = "http://localhost:8080";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const tmdbId = searchParams.get("tmdbId");
  const mediaType = searchParams.get("mediaType");

  if (!tmdbId || !mediaType) {
    return NextResponse.json({ message: "tmdbId and mediaType are required" }, { status: 400 });
  }

  const backendBase = process.env.BACKEND_URL || DEFAULT_BACKEND_URL;
  const backendURL = new URL("/details", backendBase);
  backendURL.searchParams.set("tmdbId", tmdbId);
  backendURL.searchParams.set("mediaType", mediaType);

  try {
    const backendResponse = await fetch(backendURL, {
      headers: { accept: "application/json" },
      cache: "no-store",
    });

    const payload = await backendResponse
      .json()
      .catch(() => ({ message: "DropDate backend повернув не JSON" }));

    if (!backendResponse.ok) {
      return NextResponse.json(payload, { status: backendResponse.status });
    }

    return NextResponse.json(payload, { status: 200 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Не вдалося зʼєднатись із бекендом";
    return NextResponse.json({ message }, { status: 502 });
  }
}
