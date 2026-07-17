import { NextRequest, NextResponse } from "next/server";
const DEFAULT_BACKEND_URL = "http://localhost:8080";
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  try {
    const response = await fetch(new URL("/akinator/result", process.env.BACKEND_URL || DEFAULT_BACKEND_URL), { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body), cache: "no-store" });
    return NextResponse.json(await response.json().catch(() => ({ message: "Некоректна відповідь бекенда" })), { status: response.status });
  } catch (error) { return NextResponse.json({ message: error instanceof Error ? error.message : "Бекенд недоступний" }, { status: 502 }); }
}
