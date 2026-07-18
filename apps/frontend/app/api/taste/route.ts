import { NextRequest, NextResponse } from "next/server";

const DEFAULT_BACKEND_URL = "http://localhost:8080";

async function forward(request: NextRequest) {
  const backendURL = new URL(
    `/taste${request.nextUrl.search}`,
    process.env.BACKEND_URL || DEFAULT_BACKEND_URL
  );
  const authorization = request.headers.get("authorization");
  const response = await fetch(backendURL, {
    method: request.method,
    headers: {
      accept: "application/json",
      ...(authorization ? { authorization } : {}),
      ...(request.method === "POST"
        ? { "content-type": "application/json" }
        : {}),
    },
    body: request.method === "POST" ? await request.text() : undefined,
    cache: "no-store",
  });
  const payload = await response
    .json()
    .catch(() => ({ message: "DropDate backend повернув не JSON" }));
  return NextResponse.json(payload, { status: response.status });
}

export async function GET(request: NextRequest) {
  try {
    return await forward(request);
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Бекенд недоступний" },
      { status: 502 }
    );
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}
