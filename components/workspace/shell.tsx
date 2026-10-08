"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { Icon } from "@/components/ui/icon";
import { useWorkspace, refreshWorkspace } from "@/lib/workspace-store";
import { clearWorkspace } from "@/lib/workspace-store";
import { authClient } from "@/lib/auth-client";
import { useAccount } from "@/components/auth/account-provider";

export function Shell({ children }: { children: ReactNode }) {
  const { workspace, loading, saving, connected, error } = useWorkspace();
  const account = useAccount();
  const [loggingOut, setLoggingOut] = useState(false);
  const [accountError, setAccountError] = useState("");
  async function logout() {
    setLoggingOut(true); setAccountError("");
    try {
      const result = await authClient.signOut();
      if (result.error) throw new Error("ออกจากระบบไม่สำเร็จ กรุณาลองอีกครั้ง");
      clearWorkspace(); window.location.replace("/login");
    } catch { setAccountError("ออกจากระบบไม่สำเร็จ กรุณาลองอีกครั้ง"); setLoggingOut(false); }
  }
  return (
    <div className="workspace-shell">
      <header className="topbar">
        <Link href="/" className="brand">
          <span className="brand-mark">
            <Icon name="grid" size={19} />
          </span>
          <span>
            manage<span className="brand-light">from.</span>
          </span>
        </Link>
        <div className="topbar-right">
          <Link href="/account" className="account-link"><span className="workspace-label">{account?.name || "บัญชีของฉัน"}</span><span className="user-avatar">{account?.name.slice(0, 2).toUpperCase() || "MF"}</span></Link>
          <button className="account-signout" onClick={() => void logout()} disabled={loggingOut}>{loggingOut ? "กำลังออก…" : "ออกจากระบบ"}</button>
        </div>
      </header>
      {accountError && <div className="database-banner database-error" role="alert">{accountError}</div>}
      {error && <div className="database-banner database-error" role="alert">
        <span>{error}</span>
        <button className="button" disabled={loading || saving} onClick={() => void refreshWorkspace()}>ลองเชื่อมต่ออีกครั้ง</button>
      </div>}
      {loading && !connected ? <div className="database-loading" role="status">กำลังโหลดข้อมูล…</div> :
        connected || workspace.creditors.length > 0 ? children : <div className="database-loading">เชื่อมต่อฐานข้อมูลเพื่อเริ่มใช้งาน</div>}
      <footer className="workspace-footer">
        <span className="demo-dot" />
        {saving ? "กำลังบันทึกข้อมูล…" : loading ? "กำลังโหลดข้อมูล…" : connected ? "เชื่อมต่อฐานข้อมูลแล้ว · บันทึกข้อมูลร่วมกันทุกเครื่อง" : "ยังเชื่อมต่อฐานข้อมูลไม่ได้"}
      </footer>
    </div>
  );
}
