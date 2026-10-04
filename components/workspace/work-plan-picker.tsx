"use client";

import { useState } from "react";
import { savedWorkPlans, resumeWorkPlan } from "@/lib/work-plans";
import { money } from "@/lib/demo-data";
import { Icon } from "@/components/ui/icon";
import type { Payment, Workspace } from "@/types/workspace";
import styles from "./payment-form.module.css";

export function WorkPlanPicker({
  workspace,
  onSelect,
  onNew,
}: {
  workspace: Workspace;
  onSelect: (payment: Payment) => void;
  onNew: () => void;
}) {
  const [creditorId, setCreditorId] = useState("");
  const [projectId, setProjectId] = useState("");
  const [category, setCategory] = useState("");
  const plans = savedWorkPlans(workspace.payments);
  const ownerPlans = plans.filter((item) => item.creditorId === creditorId);
  const sitePlans = ownerPlans.filter((item) => item.projectId === projectId);
  const categories = [
    ...new Set(sitePlans.map((item) => item.document!.workCategory)),
  ];
  const matching = category
    ? savedWorkPlans(
        workspace.payments,
        creditorId,
        projectId,
        category === "__empty__" ? "" : category,
      )
    : [];
  function chooseSite(value: string, available = ownerPlans) {
    setProjectId(value);
    const work = [
      ...new Set(
        available
          .filter((item) => item.projectId === value)
          .map((item) => item.document!.workCategory),
      ),
    ];
    setCategory(work.length === 1 ? work[0] || "__empty__" : "");
  }
  if (!plans.length)
    return (
      <section className={styles.emptyPlans}>
        <span className={styles.modeIcon}>
          <Icon name="folder" size={26} />
        </span>
        <h3>ยังไม่มีแผนงานที่บันทึกไว้</h3>
        <p>
          สร้างงานใหม่และบันทึกงวดแรกก่อน
          ครั้งถัดไปกลับมาเลือกเบิกงวดต่อได้ที่นี่
        </p>
        <button type="button" className="button button-primary" onClick={onNew}>
          สร้างงานใหม่
        </button>
      </section>
    );
  return (
    <section
      className={styles.sourcePicker}
      aria-label="เลือกชุดงานเดิมเพื่อเบิกงวดถัดไป"
    >
      <div className={styles.pickerHeading}>
        <span className={styles.modeIcon}>
          <Icon name="folder" size={22} />
        </span>
        <div>
          <strong>เลือกงานที่จะเบิกต่อ</strong>
          <p>เลือกเจ้าหนี้ก่อน ระบบจะแสดงเฉพาะหน้างานและหมวดงานของเจ้านั้น</p>
        </div>
      </div>
      <div className={styles.sourceFields}>
        <label>
          <span>
            <b>1</b> เจ้าหนี้
          </span>
          <select
            aria-label="เจ้าหนี้ของแผนเดิม"
            value={creditorId}
            onChange={(event) => {
              const value = event.target.value;
              setCreditorId(value);
              const available = plans.filter(
                (item) => item.creditorId === value,
              );
              const sites = [
                ...new Set(available.map((item) => item.projectId)),
              ];
              chooseSite(sites.length === 1 ? sites[0] : "", available);
            }}
          >
            <option value="">เลือกเจ้าหนี้ที่ต้องการเบิก</option>
            {workspace.creditors
              .filter((item) =>
                plans.some((plan) => plan.creditorId === item.id),
              )
              .map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
          </select>
        </label>
        {creditorId && (
          <label>
            <span>
              <b>2</b> หน้างาน
            </span>
            <select
              aria-label="หน้างานของแผนเดิม"
              value={projectId}
              onChange={(event) => chooseSite(event.target.value)}
            >
              <option value="">เลือกหน้างาน</option>
              {workspace.projects
                .filter((item) =>
                  ownerPlans.some((plan) => plan.projectId === item.id),
                )
                .map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
            </select>
          </label>
        )}
        {projectId && (
          <label>
            <span>
              <b>3</b> หมวดงาน
            </span>
            <select
              aria-label="หมวดงานของแผนเดิม"
              value={category}
              onChange={(event) => setCategory(event.target.value)}
            >
              <option value="">เลือกหมวดงาน</option>
              {categories.map((item) => (
                <option key={item} value={item || "__empty__"}>
                  {item || "ยังไม่ระบุหมวดงาน"}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>
      {category && (
        <div
          className={styles.workChoices}
          aria-label="ชุดงานที่เลือกเบิกต่อได้"
        >
          <div className={styles.workChoicesHeading}>
            พบ {matching.length} ชุดงาน <span>เลือกงานเพื่อเปิดงวดถัดไป</span>
          </div>
          {matching.map((item) => {
            const doc = item.document!;
            const booked = doc.installments!.filter(
              (claim) => claim.paymentId,
            ).length;
            const resumed = resumeWorkPlan(item);
            const complete = booked === doc.totalInstallments;
            return (
              <article
                className={styles.workChoice}
                key={doc.installmentGroupId}
              >
                <div className={styles.workChoiceTop}>
                  <strong>{item.description}</strong>
                  <span className={styles.nextBadge}>
                    {complete
                      ? "เบิกครบแล้ว"
                      : `งวดถัดไป ${resumed.index + 1} / ${doc.totalInstallments}`}
                  </span>
                </div>
                <div className={styles.workChoiceBottom}>
                  <span>
                    มูลค่างาน <b>฿{money(doc.totalWorkAmount)}</b> · บันทึกแล้ว{" "}
                    {booked} งวด
                  </span>
                  <button
                    type="button"
                    className="button button-primary"
                    aria-label={`${complete ? "เปิดแผน" : `เบิกงวดที่ ${resumed.index + 1}`} ${item.description}`}
                    onClick={() => onSelect(item)}
                  >
                    {complete
                      ? "เปิดแผนงาน"
                      : `เบิกงวดที่ ${resumed.index + 1}`}
                    <Icon name="arrow" size={15} />
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
      {!creditorId && (
        <p className={styles.pickerHint}>
          เลือกเจ้าหนี้เพื่อเริ่มค้นหางานเดิมของคุณ
        </p>
      )}
    </section>
  );
}
