import { AccessError, invitationInfo, sameOrigin } from "@/lib/access";
import { limitAccessRequest } from "@/lib/auth-rate-limit";
export const runtime = "nodejs";
export async function POST(request: Request) {
  if (!sameOrigin(request)) return Response.json({ message: "คำขอไม่ถูกต้อง" }, { status: 403 });
  try {
    await limitAccessRequest(request, "invite-info", 30);
    const body = await request.json();
    if (typeof body.token !== "string") throw new AccessError("ลิงก์เชิญไม่ถูกต้อง");
    const invite = await invitationInfo(body.token);
    return Response.json({ email: invite.email, role: invite.role }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return Response.json({ message: error instanceof AccessError ? error.message : "ตรวจสอบลิงก์ไม่สำเร็จ กรุณาลองอีกครั้ง" }, { status: error instanceof AccessError ? error.status : 503 }); }
}
