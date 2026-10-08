import { getAuth } from "@/lib/auth";
import { accessCollections, getAccess, sameOrigin } from "@/lib/access";
export const runtime = "nodejs";
const getPaths = new Set(["get-session", "list-sessions"]);
const postPaths = new Set(["sign-in/email", "sign-out", "change-password", "revoke-session", "revoke-other-sessions"]);
async function handle(request: Request, allowed: Set<string>) {
  const path = new URL(request.url).pathname.slice("/api/auth/".length);
  if (!allowed.has(path)) return Response.json({ message: "บัญชีผู้ใช้งานสร้างโดยแอดมินเท่านั้น", code: "ADMIN_REQUIRED" }, { status: 403 });
  if (request.method === "POST" && !sameOrigin(request)) return Response.json({ message: "ไม่สามารถส่งคำขอจากหน้านี้ได้" }, { status: 403 });
  try {
    const access = path === "change-password" ? await getAccess(request.headers) : null;
    if (path === "change-password" && access?.member.mustChangePassword) {
      const body = await request.clone().json();
      if (body.newPassword === body.currentPassword) return Response.json({ message: "ตั้งรหัสผ่านใหม่ให้ต่างจากรหัสผ่านเริ่มต้น" }, { status: 400 });
    }
    const response = await (await getAuth()).handler(request);
    if (response.ok && path === "change-password" && access) {
      await (await accessCollections()).members.updateOne({ _id: access.user.id }, { $set: { mustChangePassword: false } });
    }
    return response;
  }
  catch { return Response.json({ message: "เชื่อมต่อระบบบัญชีไม่ได้ กรุณาลองอีกครั้ง" }, { status: 503 }); }
}
export const GET = (request: Request) => handle(request, getPaths);
export const POST = (request: Request) => handle(request, postPaths);
