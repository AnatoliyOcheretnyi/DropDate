import { NextRequest, NextResponse } from "next/server";
const BACKEND = "http://localhost:8080";
async function forward(request: NextRequest) {
  const response = await fetch(new URL("/taste/onboarding", process.env.BACKEND_URL || BACKEND), {
    method: request.method,
    headers: { authorization: request.headers.get("authorization") || "" },
    cache: "no-store",
  });
  return NextResponse.json(await response.json(), { status: response.status });
}
export async function GET(request: NextRequest) { return forward(request); }
export async function POST(request: NextRequest) { return forward(request); }
