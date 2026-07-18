import { NextRequest, NextResponse } from "next/server";

const DEFAULT_BACKEND_URL = "http://localhost:8080";

export async function GET(request: NextRequest) {
  const backendURL = new URL(
    `/taste/next${request.nextUrl.search}`,
    process.env.BACKEND_URL || DEFAULT_BACKEND_URL
  );
  const authorization = request.headers.get("authorization");
  try {
    const response = await fetch(backendURL, {
      headers: {
        accept: "application/json",
        ...(authorization ? { authorization } : {}),
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
