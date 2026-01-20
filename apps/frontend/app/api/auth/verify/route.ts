import { NextRequest, NextResponse } from "next/server";

const DEFAULT_BACKEND_URL = "http://localhost:8080";

export async function GET(request: NextRequest) {
  const backendBase = process.env.BACKEND_URL || DEFAULT_BACKEND_URL;
  const backendURL = new URL("/auth/verify", backendBase);
  const { searchParams } = new URL(request.url);
  searchParams.forEach((value, key) => backendURL.searchParams.set(key, value));

  try {
    const backendResponse = await fetch(backendURL, {
      headers: { accept: "application/json" },
      cache: "no-store",
    });
    const payload = await backendResponse
      .json()
      .catch(() => ({ message: "DropDate backend повернув не JSON" }));
    return NextResponse.json(payload, { status: backendResponse.status });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Не вдалося зʼєднатись із бекендом";
    return NextResponse.json({ message }, { status: 502 });
  }
}
