"use client";

import Link from "next/link";
import { useState } from "react";
import { Icon } from "@/components/ui/icon";
import { Shell } from "@/components/workspace/shell";
import { CreditorForm } from "@/components/workspace/creditor-form";
import { PaymentForm } from "@/components/workspace/payment-form";
import { money, paymentSummary } from "@/lib/demo-data";
import { paymentStatuses, paymentsForStatus } from "@/lib/payment-status";
import { useWorkspace } from "@/lib/workspace-store";
import styles from "./status-board.module.css";

export function StatusBoard() {
  const { workspace } = useWorkspace();
  const [adding, setAdding] = useState(false);
  const [creatingCreditor, setCreatingCreditor] = useState(false);
  const totals = paymentSummary(workspace.payments);
  return (
    <Shell>
      <main className={styles.main}>
        <div className={styles.breadcrumb}>
          พื้นที่ทำงาน <span>/</span> รายการเบิกจ่าย
        </div>
        <div className={styles.heading}>
          <div>
            <div className={styles.title}>
              <h1>รายการเบิกจ่าย</h1>
              <span>{workspace.payments.length} รายการ</span>
            </div>
            <p>เลือกสถานะเพื่อดูตารางรายการจากทุกเจ้าหนี้และทุกโปรเจกต์</p>
          </div>
          <div className={styles.actions}>
            <button
              className="button"
              onClick={() => setCreatingCreditor(true)}
            >
              เพิ่มเจ้าหนี้
            </button>
            <button
              className="button button-primary"
              onClick={() => setAdding(true)}
            >
              <Icon name="plus" size={17} />
              เพิ่มรายการ
            </button>
          </div>
        </div>
        <section className={styles.grid} aria-label="สถานะรายการเบิกจ่าย">
          {paymentStatuses.map((status) => {
            const payments = paymentsForStatus(
              workspace.payments,
              status.value,
            );
            const amount = payments.reduce(
              (sum, payment) => sum + payment.amount,
              0,
            );
            const [wholeAmount, fractionalAmount] = money(amount).split(".");
            const creditors = new Set(
              payments.map((payment) => payment.creditorId),
            ).size;
            const projects = new Set(
              payments.map((payment) => payment.projectId),
            ).size;
            return (
              <Link
                key={status.value}
                href={`/status/${status.slug}`}
                className={`${styles.card} ${styles[status.tone]} ${payments.length === 0 ? styles.emptyCard : ""}`}
                aria-label={`เปิดตารางสถานะ ${status.label}`}
              >
                <div className={styles.cardTop}>
                  <span className={styles.symbol}>
                    <Icon
                      name={
                        status.tone === "paid"
                          ? "check-circle"
                          : status.tone === "review"
                            ? "file-search"
                            : status.tone === "paused"
                              ? "pause"
                              : "clock"
                      }
                      size={24}
                    />
                  </span>
                  <div className={styles.cardHeading}>
                    <h2>{status.label}</h2>
                    <p>{status.description}</p>
                  </div>
                  <span className={styles.cornerArrow} aria-hidden="true">
                    <Icon name="arrow-up-right" size={19} />
                  </span>
                </div>
                <div className={styles.metrics}>
                  <div className={styles.amount}>
                    <span>ยอดรวมรายการ</span>
                    <strong>
                      <small>฿</small>
                      {wholeAmount}
                      <span className={styles.decimals}>
                        .{fractionalAmount}
                      </span>
                    </strong>
                  </div>
                  <div className={styles.recordCount}>
                    <strong>{payments.length}</strong>
                    <span>รายการ</span>
                  </div>
                </div>
                <div className={styles.footer}>
                  <div className={styles.related}>
                    <span>
                      <Icon name="users" size={14} />
                      {creditors} เจ้าหนี้
                    </span>
                    <span>
                      <Icon name="folder" size={14} />
                      {projects} โปรเจกต์
                    </span>
                  </div>
                  <span className={styles.open}>
                    เปิดตาราง{" "}
                    <span>
                      <Icon name="arrow" size={15} />
                    </span>
                  </span>
                </div>
              </Link>
            );
          })}
        </section>
        <section className={styles.summary} aria-label="ภาพรวมรายการทุกสถานะ">
          <div>
            <span>ยอดรายการทั้งหมด</span>
            <strong>฿{money(totals.total)}</strong>
          </div>
          <div>
            <span>ยอดที่จ่ายแล้ว</span>
            <strong>฿{money(totals.paid)}</strong>
          </div>
          <div>
            <span>ยอดยังไม่ชำระ</span>
            <strong>฿{money(totals.pending)}</strong>
          </div>
        </section>
      </main>
      {adding && <PaymentForm onClose={() => setAdding(false)} />}
      {creatingCreditor && (
        <CreditorForm onClose={() => setCreatingCreditor(false)} />
      )}
    </Shell>
  );
}
