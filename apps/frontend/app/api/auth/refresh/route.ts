import { NextRequest, NextResponse } from "next/server";

const DEFAULT_BACKEND_URL = "http://localhost:8080";

export async function POST(request: NextRequest) {
  const backendBase = process.env.BACKEND_URL || DEFAULT_BACKEND_URL;
  const backendURL = new URL("/auth/refresh", backendBase);
  const cookie = request.headers.get("cookie");

  let body: unknown = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  try {
    const backendResponse = await fetch(backendURL, {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        ...(cookie ? { cookie } : {}),
      },
      body: JSON.stringify(body),
      cache: "no-store",
    });

    const payload = await backendResponse
      .json()
      .catch(() => ({ message: "DropDate backend повернув не JSON" }));

    const response = NextResponse.json(payload, { status: backendResponse.status });
    const setCookie = backendResponse.headers.get("set-cookie");
    if (setCookie) {
      response.headers.set("set-cookie", setCookie);
    }
    return response;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Не вдалося зʼєднатись із бекендом";
    return NextResponse.json({ message }, { status: 502 });
  }
}
