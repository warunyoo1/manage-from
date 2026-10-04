"use client";

import Link from "next/link";
import { useState } from "react";
import { Icon } from "@/components/ui/icon";
import { Shell } from "@/components/workspace/shell";
import { PaymentForm, today } from "@/components/workspace/payment-form";
import { money, paymentSummary } from "@/lib/demo-data";
import {
  paymentStatuses,
  paymentsForStatus,
  statusLabel,
  type StatusFilter,
} from "@/lib/payment-status";
import { StatusSelect } from "@/components/workspace/status-select";
import {
  toggleCreditorFavorite,
  updatePayment,
  useWorkspace,
} from "@/lib/workspace-store";
import type { Payment, PaymentStatus, Project } from "@/types/workspace";
import styles from "./creditor-detail.module.css";

function dateLabel(value: string) {
  if (!value) return "—";
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
}

function exportCsv(
  payments: Payment[],
  creditorName: string,
  projects: Project[],
) {
  const headers = [
    "วันที่ตั้งเบิก",
    "เจ้าหนี้",
    "Project",
    "ลักษณะงาน",
    "งวดงาน",
    "สัญชาติ",
    "รูปแบบ",
    "สถานะ",
    "Bank",
    "สาขา",
    "เลขบัญชี",
    "ชื่อบัญชีผู้รับ",
    "วันที่ชำระ",
    "ยอดจ่ายตามจริง",
    "Note",
    "ลง Flow",
  ];
  const escape = (value: string | number) => {
    const text = String(value);
    return `"${(/^[=+@\-\t\r]/.test(text) ? "'" + text : text).replaceAll('"', '""')}"`;
  };
  const rows = payments.map((p) => [
    dateLabel(p.requestedDate),
    p.creditor,
    projects.find((project) => project.id === p.projectId)?.name ??
      "ไม่พบโปรเจกต์",
    p.description,
    p.installment,
    p.nationality,
    p.category,
    statusLabel(p.status),
    p.bank,
    p.branch,
    p.accountNumber,
    p.accountName,
    dateLabel(p.paidDate),
    p.amount,
    p.note,
    p.flow ? "ใช่" : "ไม่",
  ]);
  const blob = new Blob(
    [
      "\uFEFF" +
        [headers, ...rows].map((row) => row.map(escape).join(",")).join("\r\n"),
    ],
    { type: "text/csv;charset=utf-8;" },
  );
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${creditorName}-รายการเบิกจ่าย.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function CreditorTable({
  creditorId,
  initialStatus = "all",
  fixedStatus,
}: {
  creditorId?: string;
  initialStatus?: StatusFilter;
  fixedStatus?: PaymentStatus;
}) {
  const { workspace, saving, loading, connected } = useWorkspace();
  const busy = saving || loading || !connected;
  const creditor = workspace.creditors.find((item) => item.id === creditorId);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StatusFilter>(initialStatus);
  const [projectFilter, setProjectFilter] = useState("all");
  const [sort, setSort] = useState("date");
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<Payment | null>(null);
  const [notice, setNotice] = useState("");
  async function persist(action: () => Promise<void>, success?: string) {
    try { await action(); if (success) setNotice(success); }
    catch (cause) { setNotice(cause instanceof Error ? cause.message : "บันทึกไม่สำเร็จ"); }
  }
  const [creditorFilter, setCreditorFilter] = useState("all");
  const payments = fixedStatus
    ? paymentsForStatus(workspace.payments, fixedStatus)
    : workspace.payments.filter(
        (payment) => !creditorId || payment.creditorId === creditorId,
      );
  const selectedStatus = paymentStatuses.find(
    (item) => item.value === fixedStatus,
  );
  const title =
    selectedStatus?.label ?? creditor?.name ?? "รายการเบิกจ่ายทั้งหมด";
  const creditorIds = new Set(payments.map((payment) => payment.creditorId));
  const linkedCreditors = workspace.creditors.filter((item) =>
    creditorIds.has(item.id),
  );
  const summary = paymentSummary(payments);
  const projectIds = new Set(payments.map((p) => p.projectId));
  const linkedProjects = workspace.projects.filter((item) =>
    projectIds.has(item.id),
  );
  const visible = payments
    .filter(
      (p) =>
        (status === "all" || p.status === status) &&
        (projectFilter === "all" || p.projectId === projectFilter) &&
        (creditorFilter === "all" || p.creditorId === creditorFilter) &&
        `${p.creditor} ${workspace.projects.find((item) => item.id === p.projectId)?.name ?? ""} ${p.description} ${p.accountName} ${p.note} ${p.bank}`
          .toLowerCase()
          .includes(query.toLowerCase().trim()),
    )
    .sort((a, b) =>
      sort === "amount"
        ? b.amount - a.amount
        : sort === "project"
          ? (
              workspace.projects.find((p) => p.id === a.projectId)?.name ?? ""
            ).localeCompare(
              workspace.projects.find((p) => p.id === b.projectId)?.name ?? "",
              "th",
            )
          : b.requestedDate.localeCompare(a.requestedDate),
    );

  if (creditorId && !creditor)
    return (
      <Shell>
        <main className="board-main">
          <Link href="/" className="back-link">
            <Icon name="back" />
            กลับไปสถานะทั้งหมด
          </Link>
          <div className="empty-state">
            <Icon name="folder" size={36} />
            <h1>ไม่พบเจ้าหนี้นี้</h1>
            <p>กลับไปเลือกสถานะจากหน้ารวมอีกครั้ง</p>
          </div>
        </main>
      </Shell>
    );

  return (
    <Shell>
      <main className={`table-main ${styles.main}`}>
        <Link href="/" className="back-link">
          <Icon name="back" size={16} />
          สถานะทั้งหมด
        </Link>
        <div className="page-heading table-heading">
          <div>
            <p className="eyebrow">
              รายการเบิกจ่าย / {fixedStatus ? "สถานะ" : "เจ้าหนี้"}
            </p>
            <div className="project-title">
              <span
                className={`project-color-dot ${selectedStatus ? styles[selectedStatus.tone] : `color-${creditor?.color ?? "cyan"}`}`}
              />
              <h1>{title}</h1>
              {creditor && (
                <button
                  className={`icon-button ${creditor.favorite ? "is-favorite" : ""}`}
                  aria-label={
                    creditor.favorite
                      ? "เลิกปักหมุดเจ้าหนี้"
                      : "ปักหมุดเจ้าหนี้"
                  }
                  aria-pressed={creditor.favorite}
                  disabled={busy}
                  onClick={() => void persist(() => toggleCreditorFavorite(creditor.id))}
                >
                  <Icon name="bookmark" filled={creditor.favorite} />
                </button>
              )}
            </div>
            <p className="page-description">
              {selectedStatus
                ? "รายการจากทุกเจ้าหนี้ในสถานะนี้"
                : creditor?.description || "รายการเบิกจ่ายของเจ้าหนี้"}
              <span className="description-divider">·</span>
              {linkedProjects.length} โปรเจกต์ · {payments.length} รายการ
            </p>
          </div>
          <button
            className="button button-primary"
            onClick={() => setAdding(true)}
          >
            <Icon name="plus" />
            เพิ่มรายการ
          </button>
        </div>
        <section
          className="summary-grid"
          aria-label={
            fixedStatus ? "ยอดรวมของสถานะนี้" : "ยอดรวมของเจ้าหนี้ทุกโปรเจกต์"
          }
        >
          {fixedStatus ? (
            <>
              <div className="summary-card">
                <span>ยอดรายการสถานะ{title}</span>
                <strong>
                  <small>฿</small>
                  {money(summary.total)}
                </strong>
                <p>รวมทุกเจ้าหนี้และทุกโปรเจกต์ในสถานะนี้</p>
              </div>
              <div className="summary-card">
                <span>จำนวนรายการ</span>
                <strong>
                  {payments.length}
                  <small> รายการ</small>
                </strong>
                <p>{selectedStatus?.description}</p>
              </div>
              <div className="summary-card">
                <span>เจ้าหนี้ที่มีรายการ</span>
                <strong>
                  {linkedCreditors.length}
                  <small> เจ้า</small>
                </strong>
                <p>ผู้รับเงินที่อยู่ในสถานะนี้</p>
              </div>
              <div className="summary-card">
                <span>โปรเจกต์ที่มีรายการ</span>
                <strong>
                  {linkedProjects.length}
                  <small> โปรเจกต์</small>
                </strong>
                <p>รวมจากทุกเจ้าหนี้ในสถานะนี้</p>
              </div>
            </>
          ) : (
            <>
              <div className="summary-card">
                <span>ยอดรายการทั้งหมด</span>
                <strong>
                  <small>฿</small>
                  {money(summary.total)}
                </strong>
                <p>{payments.length} รายการจากทุกโปรเจกต์</p>
              </div>
              <div className="summary-card">
                <span>
                  <i className="summary-dot paid" />
                  จ่ายแล้ว
                </span>
                <strong className="text-green">
                  <small>฿</small>
                  {money(summary.paid)}
                </strong>
                <p>
                  {payments.filter((p) => p.status === "จ่ายแล้ว").length}{" "}
                  รายการที่ชำระแล้ว
                </p>
              </div>
              <div className="summary-card">
                <span>
                  <i className="summary-dot pending" />
                  ยังไม่ชำระ
                </span>
                <strong className="text-orange">
                  <small>฿</small>
                  {money(summary.pending)}
                </strong>
                <p>
                  {payments.filter((p) => p.status !== "จ่ายแล้ว").length}{" "}
                  รายการรอชำระ
                </p>
              </div>
              <div className="summary-card summary-progress">
                <span>ความคืบหน้าการจ่าย</span>
                <strong>
                  {summary.progress}
                  <small>%</small>
                </strong>
                <div className="progress-track">
                  <span style={{ width: `${summary.progress}%` }} />
                </div>
                <p>คำนวณจากยอดเงินที่จ่ายแล้ว</p>
              </div>
            </>
          )}
        </section>
        {notice && (
          <p role="status" className={styles.notice}>
            {notice}
          </p>
        )}
        <section className="table-panel" aria-label="ตารางเบิกจ่าย">
          <div className="table-panel-heading">
            <div>
              <h2>
                รายการเบิกจ่าย<span>{payments.length}</span>
              </h2>
              <p>
                {fixedStatus
                  ? `เฉพาะสถานะ${title} จากทุกเจ้าหนี้`
                  : `รายการของ ${creditor?.name} เท่านั้น`}
              </p>
            </div>
            <button
              className="button export-button"
              disabled={visible.length === 0}
              onClick={() => exportCsv(visible, title, workspace.projects)}
            >
              <Icon name="download" size={16} />
              ส่งออก CSV
            </button>
          </div>
          <div className="table-toolbar">
            <label className="search-box">
              <Icon name="search" size={17} />
              <input
                aria-label="ค้นหารายการ"
                placeholder="ค้นหาเจ้าหนี้ โปรเจกต์ หรือลักษณะงาน..."
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </label>
            <div className="table-filters">
              {fixedStatus && (
                <select
                  className="project-filter-select"
                  aria-label="กรองเจ้าหนี้"
                  value={creditorFilter}
                  onChange={(event) => setCreditorFilter(event.target.value)}
                >
                  <option value="all">ทุกเจ้าหนี้</option>
                  {linkedCreditors.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              )}
              <select
                className="project-filter-select"
                aria-label="กรองโปรเจกต์"
                value={projectFilter}
                onChange={(event) => setProjectFilter(event.target.value)}
              >
                <option value="all">ทุกโปรเจกต์</option>
                {linkedProjects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
              {!fixedStatus && (
                <StatusSelect
                  label="กรองสถานะ"
                  value={status}
                  onChange={setStatus}
                  allowAll
                />
              )}
              <select
                aria-label="เรียงรายการ"
                className="sort-select"
                value={sort}
                onChange={(event) => setSort(event.target.value)}
              >
                <option value="date">วันที่ล่าสุด</option>
                <option value="amount">ยอดเงินมากที่สุด</option>
                <option value="project">ชื่อโปรเจกต์</option>
              </select>
            </div>
          </div>
          <div
            className="table-scroll"
            tabIndex={0}
            aria-label="ตารางรายการ เลื่อนแนวนอนเพื่อดูทุกคอลัมน์"
          >
            <table className="payments-table">
              <thead>
                <tr>
                  {[
                    "วันที่ตั้งเบิก",
                    "เจ้าหนี้ / ผู้รับเงิน",
                    "Project",
                    "ลักษณะงาน",
                    "งวดงาน",
                    "สัญชาติ",
                    "รูปแบบ",
                    "สถานะ",
                    "Bank",
                    "สาขา",
                    "เลขบัญชี",
                    "ชื่อบัญชีผู้รับ",
                    "วันที่ชำระ",
                    "ยอดจ่ายตามจริง",
                    "Note",
                    "ลง Flow",
                  ].map((label, index) => (
                    <th
                      key={label}
                      scope="col"
                      className={index === 13 ? "amount-column" : ""}
                    >
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visible.map((payment) => (
                  <tr
                    key={payment.id}
                    className={payment.status === "จ่ายแล้ว" ? "paid-row" : ""}
                  >
                    <td className="date-cell">
                      {dateLabel(payment.requestedDate)}
                    </td>
                    <td className="creditor-cell">
                      {workspace.creditors.find(
                        (item) => item.id === payment.creditorId,
                      )?.name ?? payment.creditor}
                    </td>
                    <td>
                      <span
                        className={`project-cell color-${workspace.projects.find((item) => item.id === payment.projectId)?.color ?? "blue"}`}
                      >
                        {workspace.projects.find(
                          (item) => item.id === payment.projectId,
                        )?.name ?? "ไม่พบโปรเจกต์"}
                      </span>
                    </td>
                    <td
                      className="description-cell"
                      title={payment.description}
                    >
                      <button
                        type="button"
                        className={styles.editDocument}
                        aria-label={`แก้ไขเอกสาร ${payment.creditor} ${payment.description}`}
                        onClick={() => setEditing(payment)}
                      >
                        {payment.description}
                        <span>แก้ไขเอกสาร</span>
                      </button>
                    </td>
                    <td className="installment-cell">
                      {payment.installment || "—"}
                    </td>
                    <td>
                      <span
                        className={`cell-pill ${payment.nationality === "ต่างด้าว" ? "foreign" : "nationality"}`}
                      >
                        {payment.nationality}
                      </span>
                    </td>
                    <td>
                      <span className="cell-pill category">
                        {payment.category}
                      </span>
                    </td>
                    <td>
                      <StatusSelect
                        label={`สถานะ ${payment.creditor} ${payment.description}`}
                        value={payment.status}
                        disabled={busy}
                        onChange={(next) => {
                          if (next === "all") return;
                          void persist(() => updatePayment(payment.id, {
                            status: next,
                            paidDate:
                              next === "จ่ายแล้ว"
                                ? payment.paidDate || today()
                                : "",
                          }), fixedStatus && next !== fixedStatus ?
                            `ย้ายรายการ “${payment.description}” ไปสถานะ${statusLabel(next)}แล้ว` : undefined);
                        }}
                      />
                    </td>
                    <td>
                      <span
                        className={`cell-pill bank bank-${payment.bank === "กสิกรไทย" ? "green" : payment.bank === "ไทยพาณิชย์" ? "purple" : payment.bank === "ออมสิน" ? "pink" : "blue"}`}
                      >
                        {payment.bank}
                      </span>
                    </td>
                    <td>{payment.branch || "—"}</td>
                    <td className="account-cell">
                      {payment.accountNumber || "—"}
                    </td>
                    <td>{payment.accountName || "—"}</td>
                    <td>
                      <input
                        className="cell-date"
                        type="date"
                        aria-label={`วันที่ชำระ ${payment.creditor} ${payment.description}`}
                        value={payment.paidDate}
                        disabled={busy || payment.status !== "จ่ายแล้ว"}
                        onChange={(event) => {
                          const paidDate = event.target.value;
                          void persist(() => updatePayment(payment.id, { paidDate }));
                        }}
                      />
                    </td>
                    <td className="amount-cell">{money(payment.amount)}</td>
                    <td className="note-cell" title={payment.note}>
                      {payment.note || "—"}
                    </td>
                    <td className="flow-cell">
                      <input
                        type="checkbox"
                        aria-label={`ลง Flow ${payment.creditor} ${payment.description}`}
                        checked={payment.flow}
                        disabled={busy}
                        onChange={(event) => {
                          const flow = event.target.checked;
                          void persist(() => updatePayment(payment.id, { flow }));
                        }}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {visible.length === 0 && (
              <div className="table-empty">
                <Icon name="search" size={28} />
                <h3>
                  {payments.length
                    ? "ไม่พบรายการที่ตรงกับตัวกรอง"
                    : fixedStatus
                      ? `ยังไม่มีรายการสถานะ${title}`
                      : "ยังไม่มีรายการของเจ้าหนี้นี้"}
                </h3>
                <p>
                  {payments.length
                    ? "ลองเปลี่ยนคำค้นหาหรือตัวกรอง"
                    : "รายการที่อยู่ในสถานะนี้จะแสดงที่นี่ หรือเพิ่มรายการใหม่ได้เลย"}
                </p>
                <button
                  className="button"
                  onClick={() => {
                    if (!payments.length) setAdding(true);
                    else {
                      setQuery("");
                      setStatus("all");
                      setProjectFilter("all");
                      setCreditorFilter("all");
                    }
                  }}
                >
                  {payments.length ? "ล้างตัวกรอง" : "เพิ่มรายการ"}
                </button>
              </div>
            )}
          </div>
          <div className="table-bottom">
            <span>
              แสดง {visible.length} จาก {payments.length} รายการ
            </span>
            <span className="filtered-total">
              ยอดรายการที่แสดง ฿
              {money(
                visible.reduce((total, payment) => total + payment.amount, 0),
              )}
            </span>
            <span>
              เลื่อนตารางแนวนอนเพื่อดูข้อมูลบัญชีและหมายเหตุ{" "}
              <Icon name="arrow" size={14} />
            </span>
          </div>
        </section>
      </main>
      {adding && (
        <PaymentForm
          creditorId={creditorId}
          initialStatus={fixedStatus}
          initialProjectId={projectFilter !== "all" ? projectFilter : undefined}
          onClose={() => setAdding(false)}
        />
      )}
      {editing && (
        <PaymentForm payment={editing} onClose={() => setEditing(null)} />
      )}
    </Shell>
  );
}
