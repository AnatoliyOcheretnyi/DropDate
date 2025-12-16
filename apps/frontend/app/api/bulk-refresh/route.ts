import { NextRequest, NextResponse } from "next/server";

const DEFAULT_BACKEND_URL = "http://localhost:8080";

export async function POST(request: NextRequest) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ message: "Invalid JSON body" }, { status: 400 });
  }

  const backendBase = process.env.BACKEND_URL || DEFAULT_BACKEND_URL;
  const backendURL = new URL("/bulk-next-release", backendBase);

  try {
    const backendResponse = await fetch(backendURL, {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await backendResponse
      .json()
      .catch(() => ({ message: "DropDate backend повернув не JSON" }));

    return NextResponse.json(data, { status: backendResponse.status });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Не вдалося зʼєднатись із бекендом";
    return NextResponse.json({ message }, { status: 502 });
  }
}
