"use client";

import { useState, type FormEvent } from "react";
import { Modal } from "@/components/ui/modal";
import { addCreditor } from "@/lib/workspace-store";

export function CreditorForm({ onClose }: { onClose: () => void }) {
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") ?? "").trim();
    if (!name) return;
    if (saving) return;
    setSaving(true);
    setError("");
    try {
      await addCreditor({
        id: crypto.randomUUID(),
        name,
        description: String(form.get("description") ?? "").trim(),
        color: "cyan",
        favorite: false,
      });
      onClose();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "บันทึกไม่สำเร็จ"); }
    finally { setSaving(false); }
  }
  return (
    <Modal title="เพิ่มเจ้าหนี้ใหม่" onClose={saving ? () => {} : onClose}>
      <form className="form-layout" onSubmit={submit}>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <label>
          ชื่อเจ้าหนี้
          <input
            name="name"
            required
            maxLength={100}
            placeholder="ชื่อเจ้าหนี้ / ผู้รับเงิน"
            autoFocus
          />
        </label>
        <label>
          รายละเอียด
          <textarea
            name="description"
            rows={2}
            maxLength={250}
            placeholder="รายละเอียดสั้น ๆ ของเจ้าหนี้"
          />
        </label>
        <div className="form-actions">
          <button type="button" className="button" disabled={saving} onClick={onClose}>
            ยกเลิก
          </button>
          <button type="submit" className="button button-primary" disabled={saving}>
            {saving ? "กำลังบันทึก…" : "เพิ่มเจ้าหนี้"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
