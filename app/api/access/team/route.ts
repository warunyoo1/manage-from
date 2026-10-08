import { AccessError, accessCollections, getAccess, sameOrigin } from "@/lib/access";
import { limitAccessRequest } from "@/lib/auth-rate-limit";
import { getAuth } from "@/lib/auth";
export const runtime = "nodejs";
export async function GET(request: Request) {
  try {
    const access = await getAccess(request.headers);
    if (!access) return Response.json({ message: "กรุณาเข้าสู่ระบบ" }, { status: 401 });
    if (access.member.role !== "owner") return Response.json({ message: "เฉพาะผู้ดูแลเท่านั้น" }, { status: 403 });
    if (access.member.mustChangePassword) throw new AccessError("กรุณาเปลี่ยนรหัสผ่านเริ่มต้นก่อนใช้งาน", 403);
    const { members } = await accessCollections();
    const team = await members.find({ workspaceId: access.member.workspaceId }).project({ _id: 1, name: 1, email: 1, role: 1 }).toArray();
    return Response.json({ members: team }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return Response.json({ message: error instanceof AccessError ? error.message : "โหลดสมาชิกไม่สำเร็จ" }, { status: error instanceof AccessError ? error.status : 503 }); }
}
export async function POST(request: Request) {
  if (!sameOrigin(request)) return Response.json({ message: "คำขอไม่ถูกต้อง" }, { status: 403 });
  try {
    const access = await getAccess(request.headers);
    if (!access) return Response.json({ message: "กรุณาเข้าสู่ระบบ" }, { status: 401 });
    if (access.member.role !== "owner") throw new AccessError("เฉพาะแอดมินหลักเท่านั้นที่สร้างผู้ใช้ได้", 403);
    if (access.member.mustChangePassword) throw new AccessError("กรุณาเปลี่ยนรหัสผ่านเริ่มต้นก่อนสร้างผู้ใช้", 403);
    await limitAccessRequest(request, "team-create", 10);
    const text = await request.text();
    if (text.length > 4096) throw new AccessError("ข้อมูลมีขนาดใหญ่เกินไป", 413);
    const body = JSON.parse(text);
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !name || name.length > 80 || typeof body.password !== "string" || body.password.length < 10 || body.password.length > 128) throw new AccessError("กรอกชื่อ อีเมล และรหัสผ่านอย่างน้อย 10 ตัวอักษรให้ครบ");
    const { db, members } = await accessCollections();
    if (await db.collection("auth_users").findOne({ email })) throw new AccessError("อีเมลนี้มีบัญชีอยู่แล้ว", 409);
    // Trusted server API is invoked only after our workspace owner guard; admin endpoints stay blocked publicly.
    const result = await (await getAuth()).api.createUser({ body: { email, name, password: body.password, role: "user" } });
    const member = { _id: result.user.id, workspaceId: access.member.workspaceId, role: "member" as const, email, name, createdAt: new Date(), createdBy: access.user.id, mustChangePassword: true };
    await members.insertOne(member);
    // Never forward target-user cookies: the current admin must remain logged into their own account.
    return Response.json({ member: { _id: member._id, email, name, role: member.role, mustChangePassword: true } }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) { return Response.json({ message: error instanceof AccessError ? error.message : "สร้างผู้ใช้งานไม่สำเร็จ กรุณาลองอีกครั้ง" }, { status: error instanceof AccessError ? error.status : 503 }); }
}
