import { NextRequest, NextResponse } from "next/server";

const DEFAULT_BACKEND_URL = "http://localhost:8080";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const genres = searchParams.get("genres");
  const countries = searchParams.get("countries");
  const page = searchParams.get("page");

  if (!genres && !countries) {
    return NextResponse.json(
      { message: "genres or countries is required" },
      { status: 400 }
    );
  }

  const backendBase = process.env.BACKEND_URL || DEFAULT_BACKEND_URL;
  const backendURL = new URL("/discover", backendBase);
  if (genres) {
    backendURL.searchParams.set("genres", genres);
  }
  if (countries) {
    backendURL.searchParams.set("countries", countries);
  }
  if (page) {
    backendURL.searchParams.set("page", page);
  }

  try {
    const backendResponse = await fetch(backendURL, {
      headers: { accept: "application/json" },
      cache: "no-store",
    });

    const payload = await backendResponse
      .json()
      .catch(() => ({ message: "DropDate backend повернув не JSON" }));

    if (!backendResponse.ok) {
      return NextResponse.json(payload, { status: backendResponse.status });
    }

    return NextResponse.json(payload, { status: 200 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Не вдалося зʼєднатись із бекендом";
    return NextResponse.json({ message }, { status: 502 });
  }
}
