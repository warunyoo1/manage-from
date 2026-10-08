"use client";
import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { authClient } from "@/lib/auth-client";
import { Icon } from "@/components/ui/icon";

export function AuthForm({ invitation = false }: { invitation?: boolean }) {
  const [token, setToken] = useState("");
  const [invite, setInvite] = useState<{ email: string | null; role: string } | null>(null);
  const [checking, setChecking] = useState(invitation);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  useEffect(() => {
    if (!invitation) return;
    const value = window.location.hash.slice(1);
    let cancelled = false;
    const check = async () => {
      if (!value) throw new Error("กรุณาเปิดลิงก์เชิญที่ได้รับจากผู้ดูแล");
      const response = await fetch("/api/access/invite", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token: value }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message);
      if (!cancelled) { setToken(value); setInvite(data); }
    };
    check()
      .catch((cause) => { if (!cancelled) setError(cause instanceof Error ? cause.message : "ตรวจสอบลิงก์ไม่สำเร็จ"); })
      .finally(() => { if (!cancelled) setChecking(false); });
    return () => { cancelled = true; };
  }, [invitation]);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true); setError("");
    const fields = new FormData(event.currentTarget);
    const email = String(fields.get("email") || "").trim().toLowerCase();
    const password = String(fields.get("password") || "");
    try {
      if (invitation) {
        if (password !== fields.get("confirm")) throw new Error("รหัสผ่านทั้งสองช่องไม่ตรงกัน");
        const response = await fetch("/api/access/accept", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, email, password, name: fields.get("name") }) });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message);
      } else {
        const result = await authClient.signIn.email({ email, password, rememberMe: true });
        if (result.error) throw new Error(result.error.status === 429 ? "ลองเข้าสู่ระบบหลายครั้งเกินไป กรุณารอ 1 นาที" : result.error.status >= 500 ? "เชื่อมต่อระบบบัญชีไม่ได้ กรุณาลองอีกครั้ง" : "อีเมลหรือรหัสผ่านไม่ถูกต้อง");
        const access = await fetch("/api/workspace", { cache: "no-store" });
        if (access.status === 403 && (await access.clone().json()).error?.code === "PASSWORD_CHANGE_REQUIRED") { window.location.replace("/account"); return; }
        if (access.status === 401 || access.status === 403) { await authClient.signOut(); throw new Error("บัญชีนี้ยังไม่มีสิทธิ์เข้าพื้นที่ทำงาน กรุณาติดต่อผู้ดูแล"); }
      }
      window.location.replace("/");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "เข้าสู่ระบบไม่สำเร็จ กรุณาลองอีกครั้ง"); setBusy(false); }
  }
  return <main className="auth-page">
    <section className="auth-story" aria-label="Manage From">
      <Link href="/login" className="brand"><span className="brand-mark"><Icon name="grid" size={19} /></span><span>manage<span className="brand-light">from.</span></span></Link>
      <div className="auth-story-copy"><span className="auth-eyebrow">YOUR WORKSPACE, TOGETHER</span><h1>ทุกงาน ทุกงวด<br />จัดการได้ในที่เดียว</h1><p>ติดตามรายการเบิกจ่ายของทีม<br />จากเริ่มงาน จนถึงงวดสุดท้าย</p>
        <div className="auth-preview"><div className="auth-preview-top"><span className="auth-preview-icon"><Icon name="folder" size={22} /></span><div><strong>พื้นที่ทำงานของทีม</strong><span>ข้อมูลครบ พร้อมทำงานต่อ</span></div><Icon name="check-circle" size={22} /></div><div className="auth-preview-line"><span>เจ้าหนี้</span><Icon name="arrow" size={14} /><span>หน้างาน</span><Icon name="arrow" size={14} /><span>งวดเบิก</span></div><div className="auth-preview-progress"><i /><i /><i /><i /></div></div>
      </div><span className="auth-story-footer">เรียบง่าย เป็นระบบ และอยู่กับทีมของคุณ</span>
    </section>
    <section className="auth-panel"><div className="auth-card">
      <span className="auth-badge"><Icon name="users" size={16} /> {invitation ? invite?.role === "owner" ? "บัญชีผู้ดูแล" : "เข้าร่วมทีม" : "พื้นที่ทำงานของคุณ"}</span>
      <h2>{invitation ? "สร้างบัญชีของคุณ" : "ยินดีต้อนรับกลับ"}</h2>
      <p className="auth-description">{invitation ? "ตั้งชื่อ อีเมล และรหัสผ่านเพื่อเริ่มใช้งาน" : "เข้าสู่ระบบเพื่อดูและจัดการรายการเบิกจ่าย"}</p>
      {checking ? <p role="status">กำลังตรวจสอบลิงก์เชิญ…</p> : (!invitation || invite) && <form onSubmit={submit} className="auth-fields">
        {invitation && <label>ชื่อที่แสดง<input name="name" autoComplete="name" placeholder="ชื่อของคุณ" maxLength={80} required disabled={busy} /></label>}
        <label>อีเมล<input name="email" type="email" autoComplete="username" placeholder="you@example.com" defaultValue={invite?.email || ""} readOnly={!!invite?.email} required disabled={busy} /></label>
        <label>รหัสผ่าน<div className="auth-password"><input name="password" type={showPassword ? "text" : "password"} autoComplete={invitation ? "new-password" : "current-password"} placeholder={invitation ? "อย่างน้อย 10 ตัวอักษร" : "กรอกรหัสผ่านของคุณ"} minLength={invitation ? 10 : undefined} maxLength={128} required disabled={busy} /><button type="button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}>{showPassword ? "ซ่อน" : "แสดง"}</button></div></label>
        {invitation && <label>ยืนยันรหัสผ่าน<input name="confirm" type={showPassword ? "text" : "password"} autoComplete="new-password" placeholder="กรอกรหัสผ่านอีกครั้ง" minLength={10} maxLength={128} required disabled={busy} /></label>}
        {error && <div className="auth-error" role="alert">{error}</div>}
        <button className="auth-submit" type="submit" disabled={busy}>{busy ? "กำลังดำเนินการ…" : invitation ? "สร้างบัญชีและเริ่มใช้งาน" : "เข้าสู่ระบบ"}<Icon name="arrow" size={18} /></button>
      </form>}
      {invitation && !invite && !checking && error && <div className="auth-error" role="alert">{error}</div>}
      <p className="auth-help">{invitation ? <Link href="/login">มีบัญชีแล้ว? เข้าสู่ระบบ</Link> : "ยังไม่มีบัญชีหรือลืมรหัสผ่าน? ติดต่อผู้ดูแลพื้นที่ทำงาน"}</p>
      <div className="auth-private"><Icon name="check-circle" size={15} /> บัญชีผู้ใช้งานสร้างโดยแอดมินเท่านั้น</div>
    </div><span className="auth-copyright">Manage From · พื้นที่ทำงานสำหรับทีม</span></section>
  </main>;
}
