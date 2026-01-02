import { NextRequest, NextResponse } from "next/server";

const DEFAULT_BACKEND_URL = "http://localhost:8080";

export async function DELETE(request: NextRequest) {
  const backendBase = process.env.BACKEND_URL || DEFAULT_BACKEND_URL;
  const backendURL = new URL("/saved/items", backendBase);
  const { searchParams } = new URL(request.url);
  searchParams.forEach((value, key) => backendURL.searchParams.set(key, value));

  const authHeader = request.headers.get("authorization");

  try {
    const backendResponse = await fetch(backendURL, {
      method: "DELETE",
      headers: {
        ...(authHeader ? { authorization: authHeader } : {}),
      },
      cache: "no-store",
    });

    return new NextResponse(null, { status: backendResponse.status });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Не вдалося зʼєднатись із бекендом";
    return NextResponse.json({ message }, { status: 502 });
  }
}
