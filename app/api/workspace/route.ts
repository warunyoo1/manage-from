import { readWorkspace, writeWorkspace, WorkspaceConflict, WorkspaceValidationError } from "@/lib/workspace-repository";
import type { WorkspaceAction } from "@/lib/workspace-actions";
import { getAccess } from "@/lib/access";
export const runtime = "nodejs";
function failure(message: string, code: string, status: number) {
    return Response.json({ success: false, error: { code, message } }, { status, headers: { "Cache-Control": "no-store" } });
}
export async function GET(request: Request) {
    try {
        const access = await getAccess(request.headers);
        if (!access) return failure("กรุณาเข้าสู่ระบบเพื่อใช้งาน", "UNAUTHENTICATED", 401);
        if (access.member.mustChangePassword) return failure("กรุณาเปลี่ยนรหัสผ่านเริ่มต้นก่อนใช้งาน", "PASSWORD_CHANGE_REQUIRED", 403);
        return Response.json({ success: true, data: await readWorkspace(access.member.workspaceId) }, { headers: { "Cache-Control": "no-store" } });
    }
    catch {
        return failure("เชื่อมต่อฐานข้อมูลไม่ได้ กรุณาลองอีกครั้ง", "DATABASE_UNAVAILABLE", 503);
    }
}
export async function POST(request: Request) {
    const origin = request.headers.get("origin");
    const expectedOrigin = `${new URL(request.url).protocol}//${request.headers.get("host")}`;
    if (!origin || origin !== expectedOrigin)
        return failure("ไม่สามารถบันทึกจากหน้านี้ได้", "INVALID_ORIGIN", 403);
    if (!request.headers.get("content-type")?.startsWith("application/json"))
        return failure("รูปแบบข้อมูลไม่ถูกต้อง", "INVALID_BODY", 400);
    try {
        const access = await getAccess(request.headers);
        if (!access) return failure("กรุณาเข้าสู่ระบบเพื่อใช้งาน", "UNAUTHENTICATED", 401);
        if (access.member.mustChangePassword) return failure("กรุณาเปลี่ยนรหัสผ่านเริ่มต้นก่อนใช้งาน", "PASSWORD_CHANGE_REQUIRED", 403);
        const text = await request.text();
        if (text.length > 2000000)
            return failure("ข้อมูลมีขนาดใหญ่เกินไป", "BODY_TOO_LARGE", 413);
        let body: {
            action: WorkspaceAction;
            revision: number;
        };
        try {
            body = JSON.parse(text);
        }
        catch {
            return failure("ข้อมูลไม่ถูกต้อง", "INVALID_BODY", 400);
        }
        if (!body || typeof body !== "object")
            return failure("ข้อมูลไม่ถูกต้อง", "INVALID_BODY", 400);
        return Response.json({ success: true, data: await writeWorkspace(body.action, body.revision, access.member.workspaceId) }, { headers: { "Cache-Control": "no-store" } });
    }
    catch (error) {
        if (error instanceof WorkspaceConflict)
            return failure(error.message, "CONFLICT", 409);
        if (error instanceof WorkspaceValidationError)
            return failure(error.message, "VALIDATION", 422);
        return failure("บันทึกลงฐานข้อมูลไม่สำเร็จ กรุณาลองอีกครั้ง", "DATABASE_UNAVAILABLE", 503);
    }
}
