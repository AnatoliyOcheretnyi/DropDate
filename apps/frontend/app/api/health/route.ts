import { NextResponse } from "next/server";

const DEFAULT_BACKEND_URL = "http://localhost:8080";

// A sleeping Render instance holds the connection open for the whole cold start.
// Cap the wait so the client learns "not awake yet" in seconds, not a minute.
const PING_TIMEOUT_MS = 4000;

export async function GET() {
  const backendBase = process.env.BACKEND_URL || DEFAULT_BACKEND_URL;
  const backendURL = new URL("/health", backendBase);

  try {
    const backendResponse = await fetch(backendURL, {
      method: "GET",
      headers: { accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(PING_TIMEOUT_MS),
    });

    const payload = await backendResponse
      .json()
      .catch(() => ({ message: "DropDate backend повернув не JSON" }));

    return NextResponse.json(payload, { status: backendResponse.status });
  } catch (error) {
    const isTimeout = error instanceof Error && error.name === "TimeoutError";
    const message = isTimeout
      ? "Бекенд ще прокидається"
      : error instanceof Error
        ? error.message
        : "Не вдалося зʼєднатись із бекендом";
    return NextResponse.json({ message }, { status: isTimeout ? 503 : 502 });
  }
}
