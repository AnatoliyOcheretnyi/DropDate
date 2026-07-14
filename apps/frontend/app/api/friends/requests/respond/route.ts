import { NextRequest, NextResponse } from "next/server";

const DEFAULT_BACKEND_URL = "http://localhost:8080";

export async function POST(request: NextRequest) {
  const backendBase = process.env.BACKEND_URL || DEFAULT_BACKEND_URL;
  const backendURL = new URL("/friends/requests/respond", backendBase);
  const authHeader = request.headers.get("authorization");

  try {
    const body = await request.text();
    const backendResponse = await fetch(backendURL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        accept: "application/json",
        ...(authHeader ? { authorization: authHeader } : {}),
      },
      body,
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
