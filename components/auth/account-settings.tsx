"use client";
import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { Shell } from "@/components/workspace/shell";
import { useAccount } from "@/components/auth/account-provider";
import { authClient } from "@/lib/auth-client";
import { Icon } from "@/components/ui/icon";

type Member = { _id: string; name: string; email: string; role: string };
export function AccountSettings() {
  const account = useAccount();
  const [members, setMembers] = useState<Member[]>([]);
  const [teamError, setTeamError] = useState("");
  const [teamMessage, setTeamMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [passwordBusy, setPasswordBusy] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState("");
  const [passwordError, setPasswordError] = useState("");
  useEffect(() => {
    if (account?.role !== "owner" || account.mustChangePassword) return;
    fetch("/api/access/team", { cache: "no-store" }).then(async response => { const data = await response.json(); if (!response.ok) throw new Error(data.message); setMembers(data.members); }).catch(cause => setTeamError(cause instanceof Error ? cause.message : "โหลดผู้ใช้งานไม่สำเร็จ"));
  }, [account?.role, account?.mustChangePassword]);
  async function createUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setTeamError(""); setTeamMessage("");
    const form = event.currentTarget;
    const fields = new FormData(form);
    try {
      if (fields.get("password") !== fields.get("confirm")) throw new Error("รหัสผ่านทั้งสองช่องไม่ตรงกัน");
      const response = await fetch("/api/access/team", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: fields.get("email"), name: fields.get("name"), password: fields.get("password") }) });
      const data = await response.json(); if (!response.ok) throw new Error(data.message);
      setMembers(current => [...current, data.member]); form.reset();
      setTeamMessage("สร้างบัญชี " + data.member.email + " แล้ว ผู้ใช้ล็อกอินด้วยรหัสผ่านที่ตั้งไว้ และต้องเปลี่ยนรหัสผ่านก่อนใช้งาน");
    } catch (cause) { setTeamError(cause instanceof Error ? cause.message : "สร้างผู้ใช้งานไม่สำเร็จ"); } finally { setBusy(false); }
  }
  async function changePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setPasswordBusy(true); setPasswordMessage(""); setPasswordError("");
    const form = event.currentTarget;
    const fields = new FormData(form);
    try {
      if (fields.get("newPassword") !== fields.get("confirm")) throw new Error("รหัสผ่านใหม่ทั้งสองช่องไม่ตรงกัน");
      const result = await authClient.changePassword({ currentPassword: String(fields.get("currentPassword")), newPassword: String(fields.get("newPassword")), revokeOtherSessions: true });
      if (result.error) throw new Error(result.error.status === 429 ? "ลองหลายครั้งเกินไป กรุณารอ 1 นาที" : "เปลี่ยนรหัสผ่านไม่สำเร็จ กรุณาตรวจรหัสปัจจุบัน และใช้รหัสใหม่ที่ต่างจากรหัสเดิม");
      form.reset(); setPasswordMessage("เปลี่ยนรหัสผ่านแล้ว และออกจากระบบบนเครื่องอื่นเรียบร้อย");
      if (account?.mustChangePassword) window.location.replace("/");
    } catch (cause) { setPasswordError(cause instanceof Error ? cause.message : "เปลี่ยนรหัสผ่านไม่สำเร็จ"); } finally { setPasswordBusy(false); }
  }
  const passwordForm = <form onSubmit={changePassword} className="auth-fields password-settings">
    <label>{account?.mustChangePassword ? "รหัสผ่านเริ่มต้นที่ได้รับ" : "รหัสผ่านปัจจุบัน"}<input name="currentPassword" type="password" autoComplete="current-password" required disabled={passwordBusy} /></label>
    <label>รหัสผ่านใหม่<input name="newPassword" type="password" minLength={10} maxLength={128} autoComplete="new-password" required disabled={passwordBusy} /></label>
    <label>ยืนยันรหัสผ่านใหม่<input name="confirm" type="password" minLength={10} maxLength={128} autoComplete="new-password" required disabled={passwordBusy} /></label>
    {passwordError && <div className="auth-error" role="alert">{passwordError}</div>}{passwordMessage && <div className="auth-success" role="status">{passwordMessage}</div>}
    <button className="auth-submit" disabled={passwordBusy}>{passwordBusy ? "กำลังบันทึก…" : account?.mustChangePassword ? "ตั้งรหัสผ่านและเริ่มใช้งาน" : "บันทึกรหัสผ่านใหม่"}</button>
  </form>;
  if (account?.mustChangePassword) return <main className="first-password-page"><div className="account-section"><span className="auth-badge"><Icon name="users" size={16} /> {account.role === "owner" ? "แอดมินหลัก" : "บัญชีผู้ใช้งาน"}</span><h1>ตั้งรหัสผ่านของคุณ</h1><p>{account.email}</p><p className="auth-description">บัญชีของคุณพร้อมแล้ว เปลี่ยนรหัสผ่านเริ่มต้นก่อนเข้าใช้งานครั้งแรก</p>{passwordForm}<button className="first-password-signout" onClick={async () => { const result = await authClient.signOut(); if (!result.error) window.location.replace("/login"); else setPasswordError("ออกจากระบบไม่สำเร็จ กรุณาลองอีกครั้ง"); }}>ออกจากระบบ</button></div></main>;
  return <Shell><main className="account-page">
    <Link href="/" className="account-back"><Icon name="back" size={17} /> กลับหน้าภาพรวม</Link><h1>บัญชีและผู้ใช้งาน</h1><p className="auth-description">จัดการบัญชีของคุณและผู้ใช้งานในระบบ</p>
    <section className="account-section"><div className="account-section-heading"><span className="brand-mark"><Icon name="users" /></span><div><h2>{account?.name}</h2><p>{account?.email} · {account?.role === "owner" ? "แอดมินหลัก" : "ผู้ใช้งาน"}</p></div></div></section>
    {account?.role === "owner" && <section className="account-section"><h2>ผู้ใช้งานในระบบ</h2><p>แอดมินสร้างบัญชีให้ผู้ใช้งานเพื่อจัดการรายการเบิกจ่ายร่วมกัน</p><div className="team-list">{members.map(member => <div key={member._id} className="team-member"><span className="user-avatar">{member.name.slice(0, 2).toUpperCase()}</span><div><strong>{member.name}</strong><span>{member.email}</span></div><span className="auth-badge">{member.role === "owner" ? "แอดมินหลัก" : "ผู้ใช้งาน"}</span></div>)}</div>
      <h2>สร้างผู้ใช้งานใหม่</h2><form onSubmit={createUser} className="auth-fields user-create-form">
        <label>ชื่อผู้ใช้งาน<input name="name" placeholder="ชื่อที่แสดงในระบบ" maxLength={80} required disabled={busy} /></label>
        <label>อีเมลสำหรับล็อกอิน<input name="email" type="email" autoComplete="off" placeholder="user@example.com" maxLength={254} required disabled={busy} /></label>
        <label>รหัสผ่านเริ่มต้น<input name="password" type="password" autoComplete="new-password" placeholder="อย่างน้อย 10 ตัวอักษร" minLength={10} maxLength={128} required disabled={busy} /></label>
        <label>ยืนยันรหัสผ่านเริ่มต้น<input name="confirm" type="password" autoComplete="new-password" minLength={10} maxLength={128} required disabled={busy} /></label>
        <button className="auth-submit" disabled={busy}>{busy ? "กำลังสร้าง…" : "สร้างผู้ใช้งาน"}<Icon name="plus" size={16} /></button>
      </form>{teamError && <div className="auth-error" role="alert">{teamError}</div>}{teamMessage && <div className="auth-success user-created-notice" role="status">{teamMessage}</div>}
    </section>}
    <section className="account-section"><h2>เปลี่ยนรหัสผ่าน</h2><p>ใช้อย่างน้อย 10 ตัวอักษร และควรใช้รหัสที่ไม่ซ้ำกับเว็บอื่น</p>{passwordForm}</section>
  </main></Shell>;
}
