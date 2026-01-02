import { NextRequest, NextResponse } from "next/server";

const DEFAULT_BACKEND_URL = "http://localhost:8080";

const buildBackendURL = (path: string, request: NextRequest) => {
  const backendBase = process.env.BACKEND_URL || DEFAULT_BACKEND_URL;
  const backendURL = new URL(path, backendBase);
  const { searchParams } = new URL(request.url);
  searchParams.forEach((value, key) => backendURL.searchParams.set(key, value));
  return backendURL;
};

export async function GET(request: NextRequest) {
  const backendURL = buildBackendURL("/saved", request);
  const authHeader = request.headers.get("authorization");

  try {
    const backendResponse = await fetch(backendURL, {
      headers: {
        accept: "application/json",
        ...(authHeader ? { authorization: authHeader } : {}),
      },
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

export async function POST(request: NextRequest) {
  const backendURL = buildBackendURL("/saved", request);
  const authHeader = request.headers.get("authorization");

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
        ...(authHeader ? { authorization: authHeader } : {}),
      },
      body: JSON.stringify(body),
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
