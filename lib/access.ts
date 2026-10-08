import "server-only";
import { createHash, randomUUID } from "node:crypto";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { connectDB } from "@/lib/db";
import { getAuth } from "@/lib/auth";

export type Membership = { _id: string; workspaceId: string; role: "owner" | "member"; name: string; email: string; createdAt: Date; mustChangePassword?: boolean; createdBy?: string };
type Invitation = { _id: string; workspaceId: string; role: "owner" | "member"; email: string | null; expiresAt: Date; createdAt: Date; createdBy: string; acceptedBy?: string; revokedAt?: Date; lockId?: string; lockUntil?: Date };
export class AccessError extends Error { constructor(message: string, public status = 400) { super(message); } }
export async function accessCollections() {
  const db = (await connectDB()).connection.db!;
  return { members: db.collection<Membership>("workspace_members"), invites: db.collection<Invitation>("workspace_invites"), db };
}
export const tokenHash = (token: string) => createHash("sha256").update(token).digest("hex");
export async function getAccess(requestHeaders: Headers) {
  if (!requestHeaders.get("cookie")?.includes("manage-from.session_token=")) return null;
  const session = await (await getAuth()).api.getSession({ headers: requestHeaders });
  if (!session) return null;
  const member = await (await accessCollections()).members.findOne({ _id: session.user.id });
  return member ? { user: session.user, member } : null;
}
export async function requirePageAccess(allowPasswordSetup = false) {
  const access = await getAccess(await headers());
  if (!access) redirect("/login");
  if (access.member.mustChangePassword && !allowPasswordSetup) redirect("/account");
  return access;
}
export function sameOrigin(request: Request) {
  const url = new URL(request.url);
  // Next dev may normalize the URL to localhost when the browser uses 127.0.0.1.
  const host = request.headers.get("host") || url.host;
  return request.headers.get("origin") === `${url.protocol}//${host}`;
}
async function bootstrapInvitation(token: string) {
  const secret = process.env.AUTH_SETUP_TOKEN;
  if (!secret || tokenHash(token) !== tokenHash(secret)) return;
  // Primary admin is provisioned from the server, never through public registration.
  throw new AccessError("บัญชีแอดมินหลักสร้างไว้แล้ว กรุณาเข้าสู่ระบบด้วยบัญชีที่ได้รับ", 410);
}
async function inviteId(token: string) {
  if (!/^[A-Za-z0-9_-]{40,100}$/.test(token)) throw new AccessError("ลิงก์เชิญไม่ถูกต้อง", 404);
  await bootstrapInvitation(token);
  return process.env.AUTH_SETUP_TOKEN && tokenHash(token) === tokenHash(process.env.AUTH_SETUP_TOKEN) ? "bootstrap" : tokenHash(token);
}
export async function invitationInfo(token: string) {
  const invite = await (await accessCollections()).invites.findOne({ _id: await inviteId(token), expiresAt: { $gt: new Date() }, acceptedBy: { $exists: false }, revokedAt: { $exists: false } });
  if (!invite) throw new AccessError("ลิงก์นี้หมดอายุหรือถูกใช้งานแล้ว กรุณาขอลิงก์ใหม่จากผู้ดูแล", 410);
  return invite;
}
export async function claimInvitation(token: string, email: string) {
  const info = await invitationInfo(token);
  const lockId = randomUUID();
  const { invites } = await accessCollections();
  const now = new Date();
  const claimed = await invites.findOneAndUpdate({ _id: info._id, expiresAt: { $gt: now }, acceptedBy: { $exists: false }, revokedAt: { $exists: false },
    $and: [{ $or: [{ email: null }, { email }] }, { $or: [{ lockUntil: { $exists: false } }, { lockUntil: { $lt: now } }] }],
  }, { $set: { email, lockId, lockUntil: new Date(Date.now() + 120000) } }, { returnDocument: "after" });
  if (!claimed) throw new AccessError("ลิงก์นี้ใช้ได้เฉพาะอีเมลที่ได้รับเชิญ หรือกำลังถูกใช้งาน", 409);
  return { invite: claimed, lockId };
}
export async function finishInvitation(invite: Invitation, lockId: string, user: { id: string; email: string; name: string }) {
  const { invites, members } = await accessCollections();
  const active = await invites.findOne({ _id: invite._id, lockId, revokedAt: { $exists: false }, acceptedBy: { $exists: false } });
  if (!active) throw new AccessError("ลิงก์นี้ไม่สามารถใช้งานได้แล้ว", 409);
  const existing = await members.findOne({ _id: user.id });
  if (existing && existing.workspaceId !== invite.workspaceId) throw new AccessError("บัญชีนี้อยู่ในพื้นที่ทำงานอื่นแล้ว", 409);
  await members.updateOne({ _id: user.id }, { $setOnInsert: { workspaceId: invite.workspaceId, role: invite.role, name: user.name, email: user.email, createdAt: new Date() } }, { upsert: true });
  await invites.updateOne({ _id: invite._id, lockId }, { $set: { acceptedBy: user.id }, $unset: { lockId: "", lockUntil: "" } });
}
export async function releaseInvitation(id: string, lockId: string) {
  await (await accessCollections()).invites.updateOne({ _id: id, lockId, acceptedBy: { $exists: false } }, { $unset: { lockId: "", lockUntil: "" } });
}
