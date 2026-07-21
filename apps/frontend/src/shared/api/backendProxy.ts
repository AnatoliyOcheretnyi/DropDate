import "server-only";

import { NextRequest, NextResponse } from "next/server";

const DEFAULT_BACKEND_URL = "http://localhost:8080";
const DEFAULT_TIMEOUT_MS = 15_000;

type ProxyOptions = {
  method?: string;
  forwardQuery?: boolean;
  forwardBody?: boolean;
  forwardAuth?: boolean;
  forwardSetCookie?: boolean;
  revalidate?: number;
  timeoutMs?: number;
};

export function buildBackendUrl(
  path: string,
  request: NextRequest,
  forwardQuery = true
) {
  const url = new URL(path, process.env.BACKEND_URL || DEFAULT_BACKEND_URL);
  if (forwardQuery) {
    new URL(request.url).searchParams.forEach((value, key) => {
      url.searchParams.append(key, value);
    });
  }
  return url;
}

export async function proxyBackend(
  request: NextRequest,
  path: string,
  options: ProxyOptions = {}
) {
  const method = options.method ?? request.method;
  const forwardsBody = options.forwardBody ?? !["GET", "HEAD"].includes(method);
  const auth = options.forwardAuth === false
    ? null
    : request.headers.get("authorization");
  const contentType = request.headers.get("content-type");

  try {
    const backendResponse = await fetch(
      buildBackendUrl(path, request, options.forwardQuery !== false),
      {
        method,
        headers: {
          accept: "application/json",
          ...(contentType ? { "content-type": contentType } : {}),
          ...(auth ? { authorization: auth } : {}),
        },
        ...(forwardsBody ? { body: await request.text() } : {}),
        ...(options.revalidate
          ? { next: { revalidate: options.revalidate } }
          : { cache: "no-store" as const }),
        signal: AbortSignal.timeout(options.timeoutMs ?? DEFAULT_TIMEOUT_MS),
      }
    );

    const payload = await backendResponse
      .json()
      .catch(() => ({ message: "DropDate backend повернув не JSON" }));
    const response = NextResponse.json(payload, { status: backendResponse.status });

    if (options.forwardSetCookie) {
      const setCookie = backendResponse.headers.get("set-cookie");
      if (setCookie) response.headers.set("set-cookie", setCookie);
    }

    return response;
  } catch (error) {
    const timedOut = error instanceof Error && error.name === "TimeoutError";
    return NextResponse.json(
      {
        message: timedOut
          ? "DropDate backend не відповів вчасно"
          : "Не вдалося зʼєднатись із бекендом",
      },
      { status: timedOut ? 504 : 502 }
    );
  }
}
