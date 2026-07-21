import { revalidatePath } from "next/cache";
import { NextRequest } from "next/server";
import { proxyBackend } from "../../../../../src/shared/api/backendProxy";

export async function POST(request: NextRequest) {
  const response = await proxyBackend(request, "/dev/cache/reset", {
    forwardQuery: false,
  });

  if (response.ok) {
    revalidatePath("/");
    revalidatePath("/api/home");
    revalidatePath("/profile");
    revalidatePath("/profile/dev");
  }

  return response;
}
