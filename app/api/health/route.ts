import type { ApiResponse } from "@/types/api";

export function GET() {
  const result: ApiResponse<{ status: "ok" }> = {
    success: true,
    data: { status: "ok" },
  };

  return Response.json(result, {
    headers: { "Cache-Control": "no-store" },
  });
}
