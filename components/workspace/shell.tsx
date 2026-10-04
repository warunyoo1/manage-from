"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { Icon } from "@/components/ui/icon";
import { useWorkspace, refreshWorkspace } from "@/lib/workspace-store";

export function Shell({ children }: { children: ReactNode }) {
  const { workspace, loading, saving, connected, error } = useWorkspace();
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
          <span className="workspace-label">พื้นที่ทำงานของฉัน</span>
          <span className="user-avatar">MF</span>
        </div>
      </header>
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
