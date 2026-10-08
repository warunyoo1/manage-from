import { getAuth } from "@/lib/auth";
import { AccessError, claimInvitation, finishInvitation, releaseInvitation, sameOrigin } from "@/lib/access";
import { limitAccessRequest } from "@/lib/auth-rate-limit";
export const runtime = "nodejs";
export async function POST(request: Request) {
  if (!sameOrigin(request)) return Response.json({ message: "ไม่สามารถส่งคำขอจากหน้านี้ได้" }, { status: 403 });
  let claim: Awaited<ReturnType<typeof claimInvitation>> | undefined;
  try {
    await limitAccessRequest(request, "accept", 5);
    const raw = await request.text();
    if (raw.length > 4096) throw new AccessError("ข้อมูลมีขนาดใหญ่เกินไป", 413);
    const body = JSON.parse(raw);
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254 || !name || name.length > 80 || typeof body.password !== "string" || body.password.length < 10 || body.password.length > 128 || typeof body.token !== "string") throw new AccessError("กรอกชื่อ อีเมล และรหัสผ่านอย่างน้อย 10 ตัวอักษรให้ครบ");
    claim = await claimInvitation(body.token, email);
    const auth = await getAuth();
    // Registration is only available through this invitation check, never the public auth catch-all.
    let response = await auth.api.signUpEmail({ body: { name, email, password: body.password }, headers: request.headers, asResponse: true });
    if (!response.ok) {
      // Allows safe recovery if account creation succeeded but membership persistence was interrupted.
      response = await auth.api.signInEmail({ body: { email, password: body.password }, headers: request.headers, asResponse: true });
    }
    if (!response.ok) throw new AccessError("สร้างบัญชีไม่สำเร็จ หากใช้อีเมลเดิมให้กรอกรหัสผ่านของบัญชีนั้น", 400);
    const data = await response.clone().json();
    if (!data.user?.id || data.user.email.toLowerCase() !== email) throw new Error("Invalid account response");
    await finishInvitation(claim.invite, claim.lockId, data.user);
    // Do not expose the library's session token in a JSON response.
    const result = Response.json({ success: true }, { headers: { "Cache-Control": "no-store" } });
    for (const cookie of response.headers.getSetCookie()) result.headers.append("Set-Cookie", cookie);
    return result;
  } catch (error) {
    if (claim) await releaseInvitation(claim.invite._id, claim.lockId).catch(() => {});
    return Response.json({ message: error instanceof AccessError ? error.message : "สร้างบัญชีไม่สำเร็จ กรุณาลองอีกครั้ง" }, { status: error instanceof AccessError ? error.status : 503 });
  }
}
