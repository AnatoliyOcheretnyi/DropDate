import { NextRequest, NextResponse } from "next/server";

const DEFAULT_BACKEND_URL = "http://localhost:8080";

export async function GET(request: NextRequest) {
  const backendURL = new URL(
    "/recommendations/daily",
    process.env.BACKEND_URL || DEFAULT_BACKEND_URL
  );
  const authHeader = request.headers.get("authorization");
  try {
    const response = await fetch(backendURL, {
      headers: {
        accept: "application/json",
        ...(authHeader ? { authorization: authHeader } : {}),
      },
      cache: "no-store",
    });
    const payload = await response
      .json()
      .catch(() => ({ message: "DropDate backend повернув не JSON" }));
    return NextResponse.json(payload, { status: response.status });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Бекенд недоступний" },
      { status: 502 }
    );
  }
}

export async function POST(request: NextRequest) {
  const backendURL = new URL(
    "/recommendations/daily",
    process.env.BACKEND_URL || DEFAULT_BACKEND_URL
  );
  const authHeader = request.headers.get("authorization");
  try {
    const response = await fetch(backendURL, {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        ...(authHeader ? { authorization: authHeader } : {}),
      },
      body: await request.text(),
      cache: "no-store",
    });
    const payload = await response
      .json()
      .catch(() => ({ message: "DropDate backend повернув не JSON" }));
    return NextResponse.json(payload, { status: response.status });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Бекенд недоступний" },
      { status: 502 }
    );
  }
}
