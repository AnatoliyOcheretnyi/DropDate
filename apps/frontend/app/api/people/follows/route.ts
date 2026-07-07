import { NextRequest, NextResponse } from "next/server";

const DEFAULT_BACKEND_URL = "http://localhost:8080";

const buildBackendURL = (request: NextRequest) => {
  const backendBase = process.env.BACKEND_URL || DEFAULT_BACKEND_URL;
  const backendURL = new URL("/people/follows", backendBase);
  const { searchParams } = new URL(request.url);
  searchParams.forEach((value, key) => backendURL.searchParams.set(key, value));
  return backendURL;
};

const proxy = async (
  request: NextRequest,
  method: "GET" | "POST" | "DELETE"
) => {
  const backendURL = buildBackendURL(request);
  const authHeader = request.headers.get("authorization");

  let body: string | undefined;
  if (method === "POST") {
    try {
      body = JSON.stringify(await request.json());
    } catch {
      body = "{}";
    }
  }

  try {
    const backendResponse = await fetch(backendURL, {
      method,
      headers: {
        accept: "application/json",
        ...(method === "POST" ? { "content-type": "application/json" } : {}),
        ...(authHeader ? { authorization: authHeader } : {}),
      },
      body,
      cache: "no-store",
    });

    if (backendResponse.status === 204) {
      return new NextResponse(null, { status: 204 });
    }

    const payload = await backendResponse
      .json()
      .catch(() => ({ message: "DropDate backend повернув не JSON" }));

    return NextResponse.json(payload, { status: backendResponse.status });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Не вдалося зʼєднатись із бекендом";
    return NextResponse.json({ message }, { status: 502 });
  }
};

export const GET = (request: NextRequest) => proxy(request, "GET");
export const POST = (request: NextRequest) => proxy(request, "POST");
export const DELETE = (request: NextRequest) => proxy(request, "DELETE");
