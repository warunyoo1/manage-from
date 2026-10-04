"use client";
import { useId, useRef, useState, type FormEvent } from "react";
import { Modal } from "@/components/ui/modal";
import { Icon } from "@/components/ui/icon";
import { StatusSelect } from "@/components/workspace/status-select";
import { WorkPlanPicker } from "@/components/workspace/work-plan-picker";
import { resumeWorkPlan } from "@/lib/work-plans";
import { addPayment, savePayment, useWorkspace } from "@/lib/workspace-store";
import { normalizeCreditorName } from "@/lib/workspace-data";
import {
  defaultDocument,
  documentTotals,
  installmentPlan,
  documentForInstallment,
} from "@/lib/payment-document";
import { money } from "@/lib/demo-data";
import type {
  Creditor,
  Payment,
  PaymentDocument,
  PaymentStatus,
  Project,
} from "@/types/workspace";
import styles from "./payment-form.module.css";

export function today() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}
function CurrencyField({
  label,
  value,
  onChange,
  required = false,
  disabled = false,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  required?: boolean;
  disabled?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  return (
    <input
      aria-label={label}
      type="text"
      inputMode="decimal"
      required={required}
      disabled={disabled}
      maxLength={16}
      value={editing ? draft : value ? money(value) : ""}
      placeholder="0.00"
      onFocus={() => {
        setDraft(value ? money(value) : "");
        setEditing(true);
      }}
      onBlur={() => setEditing(false)}
      onChange={(event) => {
        const amount = event.target.value.replaceAll(",", "");
        if (/^\d*\.?\d{0,2}$/.test(amount)) {
          setDraft(amount);
          onChange(Number(amount) || 0);
        }
      }}
    />
  );
}
export function PaymentForm({
  creditorId,
  initialProjectId,
  initialStatus = "ค้างจ่าย",
  payment,
  onClose,
}: {
  creditorId?: string;
  initialProjectId?: string;
  initialStatus?: PaymentStatus;
  payment?: Payment;
  onClose: () => void;
}) {
  const { workspace, saving, connected, loading } = useWorkspace();
  const id = useId();
  const viewportRef = useRef<HTMLDivElement>(null);
  const initialCreditor = workspace.creditors.find(
    (item) => item.id === (payment?.creditorId ?? creditorId),
  );
  const [chosenCreditorId, setChosenCreditorId] = useState(
    initialCreditor?.id ?? "",
  );
  const [projectName, setProjectName] = useState(
    workspace.projects.find(
      (item) => item.id === (payment?.projectId ?? initialProjectId),
    )?.name ?? "",
  );
  const [doc, setDoc] = useState<PaymentDocument>(() => ({
    ...defaultDocument(payment),
    previousClaimed:
      defaultDocument(payment).installmentBaseClaimed ??
      Math.max(
        0,
        defaultDocument(payment).previousClaimed -
          installmentPlan(payment)
            .slice(0, defaultDocument(payment).installmentNumber - 1)
            .filter((item) => item.paymentId)
            .reduce((sum, item) => sum + item.amount, 0),
      ),
    contractorName:
      payment?.document?.contractorName ?? initialCreditor?.name ?? "",
  }));
  const [plan, setPlan] = useState(() =>
    installmentPlan(payment).map((item) => ({
      ...item,
      date: item.date || today(),
    })),
  );
  const activeIndex = doc.installmentNumber - 1;
  const activeClaim = plan[activeIndex];
  const targetPayment = workspace.payments.find(
    (item) => item.id === activeClaim?.paymentId,
  );
  const [requestedDate, setRequestedDate] = useState(
    payment?.requestedDate ?? today(),
  );
  const [status, setStatus] = useState<PaymentStatus>(
    payment?.status ?? initialStatus,
  );
  const [description, setDescription] = useState(payment?.description ?? "");
  const [nationality, setNationality] = useState(payment?.nationality ?? "ไทย");
  const [category, setCategory] = useState(payment?.category ?? "ค่าแรง");
  const [bank, setBank] = useState(payment?.bank ?? "");
  const [branch, setBranch] = useState(payment?.branch ?? "");
  const [accountNumber, setAccountNumber] = useState(
    payment?.accountNumber ?? "",
  );
  const [accountName, setAccountName] = useState(payment?.accountName ?? "");
  const [paidDate, setPaidDate] = useState(payment?.paidDate || today());
  const [note, setNote] = useState(payment?.note ?? "");
  const [flow, setFlow] = useState(payment?.flow ?? false);
  const [error, setError] = useState("");
  const [loadedSource, setLoadedSource] = useState(false);
  const [mode, setMode] = useState<"choose" | "new" | "resume">(
    payment ? "new" : "choose",
  );
  const showDocument = !!payment || mode === "new" || loadedSource;
  const lockedWork = !!doc.installmentGroupId;
  const effectiveDoc = documentForInstallment(doc, plan, doc.installmentNumber);
  const totals = documentTotals(effectiveDoc);
  const plannedTotal = plan.reduce((sum, item) => sum + item.amount, 0);
  function loadWorkPlan(source: Payment) {
    const resumed = resumeWorkPlan(source);
    const selected = workspace.payments.find(
      (item) => item.id === resumed.plan[resumed.index].paymentId,
    );
    setChosenCreditorId(source.creditorId);
    setProjectName(
      workspace.projects.find((item) => item.id === source.projectId)?.name ??
        "",
    );
    setDoc(resumed.document);
    setPlan(resumed.plan);
    setDescription(source.description);
    setRequestedDate(resumed.plan[resumed.index].date || today());
    setNationality(source.nationality);
    setCategory(source.category);
    setBank(source.bank);
    setBranch(source.branch);
    setAccountNumber(source.accountNumber);
    setAccountName(source.accountName);
    setStatus(selected?.status ?? initialStatus);
    setPaidDate(selected?.paidDate || today());
    setNote(selected?.note ?? "");
    setFlow(selected?.flow ?? false);
    setError("");
    setLoadedSource(true);
    setMode("resume");
    requestAnimationFrame(() =>
      viewportRef.current?.scrollTo({ top: 0, left: 0 }),
    );
  }
  function startNewWork() {
    setDoc({
      ...defaultDocument(),
      contractorName: doc.contractorName,
      phone: doc.phone,
      address: doc.address,
      nationalId: doc.nationalId,
    });
    setPlan(installmentPlan().map((item) => ({ ...item, date: today() })));
    setRequestedDate(today());
    setDescription("");
    setStatus(initialStatus);
    setNote("");
    setFlow(false);
    setError("");
    setLoadedSource(false);
    setMode("choose");
  }
  function field<K extends keyof PaymentDocument>(
    key: K,
    value: PaymentDocument[K],
  ) {
    setDoc((current) => ({ ...current, [key]: value }));
    if (key === "requestedAmount")
      setPlan((current) =>
        current.map((item, index) =>
          index === activeIndex ? { ...item, amount: Number(value) } : item,
        ),
      );
  }
  function chooseInstallment(index: number) {
    const claim = plan[index];
    const saved = workspace.payments.find(
      (item) => item.id === claim.paymentId,
    );
    setDoc((current) => ({
      ...current,
      installmentNumber: index + 1,
      requestedAmount: claim.amount,
    }));
    setRequestedDate(claim.date);
    setStatus(saved?.status ?? initialStatus);
    setPaidDate(saved?.paidDate || today());
    setNote(saved?.note ?? "");
    setFlow(saved?.flow ?? false);
    setError("");
  }
  function changeClaim(index: number, changes: Partial<(typeof plan)[number]>) {
    setPlan((current) =>
      current.map((item, i) => (i === index ? { ...item, ...changes } : item)),
    );
    if (index === activeIndex) {
      if (changes.amount !== undefined)
        setDoc((current) => ({ ...current, requestedAmount: changes.amount! }));
      if (changes.date !== undefined) setRequestedDate(changes.date);
    }
  }
  function chooseContractor(name: string) {
    const creditor = workspace.creditors.find(
      (item) =>
        normalizeCreditorName(item.name) === normalizeCreditorName(name),
    );
    setChosenCreditorId(creditor?.id ?? "");
    const previous = creditor
      ? workspace.payments.findLast((item) => item.creditorId === creditor.id)
      : undefined;
    setDoc((current) => ({
      ...current,
      contractorName: name,
      nationalId: previous?.document?.nationalId ?? "",
      phone: previous?.document?.phone ?? "",
      address: previous?.document?.address ?? "",
    }));
    setBank(previous?.bank ?? "");
    setBranch(previous?.branch ?? "");
    setAccountNumber(previous?.accountNumber ?? "");
    setAccountName(previous?.accountName ?? name);
    setNationality(previous?.nationality ?? "ไทย");
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!showDocument || saving || loading) return;
    setError("");
    if (
      !doc.contractorName.trim() ||
      !projectName.trim() ||
      !description.trim()
    ) {
      setError("กรอกชื่อหน้างาน ผู้รับจ้าง และรายละเอียดงานให้ครบครับ");
      return;
    }
    if (
      doc.requestedAmount <= 0 ||
      doc.totalWorkAmount <= 0 ||
      !Number.isFinite(totals.net) ||
      totals.net <= 0 ||
      totals.remaining < 0 ||
      Math.round((plannedTotal + doc.previousClaimed) * 100) >
        Math.round(doc.totalWorkAmount * 100)
    ) {
      setError(
        "ตรวจสอบมูลค่างานและจำนวนเงินที่ขอเบิก ยอดเบิกรวมต้องไม่เกินมูลค่างานครับ",
      );
      return;
    }
    if (
      !Number.isInteger(doc.installmentNumber) ||
      !Number.isInteger(doc.totalInstallments) ||
      doc.installmentNumber < 1 ||
      doc.totalInstallments < doc.installmentNumber
    ) {
      setError("ตรวจสอบงวดที่เบิกและจำนวนงวดทั้งหมดครับ");
      return;
    }
    let creditor =
      workspace.creditors.find((item) => item.id === chosenCreditorId) ??
      workspace.creditors.find(
        (item) =>
          normalizeCreditorName(item.name) ===
          normalizeCreditorName(doc.contractorName),
      );
    let newCreditor: Creditor | undefined;
    if (!creditor) {
      newCreditor = {
        id: crypto.randomUUID(),
        name: doc.contractorName.trim(),
        description: "",
        color: "cyan",
        favorite: false,
      };
      creditor = newCreditor;
    }
    let project = workspace.projects.find(
      (item) =>
        normalizeCreditorName(item.name) === normalizeCreditorName(projectName),
    );
    let newProject: Project | undefined;
    if (!project) {
      newProject = {
        id: crypto.randomUUID(),
        name: projectName.trim(),
        description: "",
        color: "cyan",
        favorite: false,
      };
      project = newProject;
    }
    const result: Payment = {
      id: targetPayment?.id ?? crypto.randomUUID(),
      creditorId: creditor.id,
      creditor: creditor.name,
      projectId: project.id,
      requestedDate,
      description: description.trim(),
      installment: `${doc.installmentNumber}/${plan.length}`,
      nationality,
      category,
      status,
      bank: bank.trim(),
      branch: branch.trim(),
      accountNumber: accountNumber.trim(),
      accountName: accountName.trim(),
      paidDate: status === "จ่ายแล้ว" ? paidDate : "",
      amount: totals.net,
      note: note.trim(),
      flow,
      document: {
        ...effectiveDoc,
        contractorName: doc.contractorName.trim(),
        installmentBaseClaimed: doc.previousClaimed,
        installmentGroupId: doc.installmentGroupId ?? crypto.randomUUID(),
        installments: plan.map((item, index) =>
          index === activeIndex
            ? { ...item, amount: doc.requestedAmount, date: requestedDate }
            : item,
        ),
      },
    };
    result.document!.installments![activeIndex].paymentId = result.id;
    try {
      if (targetPayment) await savePayment(result, newProject, newCreditor);
      else await addPayment(result, newProject, newCreditor);
      onClose();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "บันทึกไม่สำเร็จ ลองอีกครั้งครับ",
      );
    }
  }
  return (
    <Modal
      title={payment ? "แก้ไขเอกสารตั้งเบิก" : "เพิ่มเอกสารตั้งเบิก"}
      className={styles.modal}
      onClose={saving ? () => {} : onClose}
    >
      <form onSubmit={submit} className={styles.form}>
        <div className={styles.toolbar}>
          <div className={styles.flowHeading}>
            {!payment && mode !== "choose" && (
              <button
                type="button"
                className={styles.flowBack}
                aria-label="กลับไปเลือกประเภท"
                onClick={() => {
                  if (loadedSource) startNewWork();
                  else setMode("choose");
                }}
              >
                <Icon name="back" size={16} />
              </button>
            )}
            <p>
              {mode === "choose"
                ? "เริ่มรายการใหม่"
                : loadedSource
                  ? "เบิกต่อจากงานเดิม"
                  : mode === "resume"
                    ? "เลือกงานเดิม"
                    : "กรอกข้อมูลและแบ่งงวดของงานใหม่"}
            </p>
          </div>
          {showDocument && (
            <StatusSelect
              label="สถานะเอกสาร"
              value={status}
              onChange={(next) => {
                if (next !== "all") setStatus(next);
              }}
            />
          )}
        </div>
        {error && (
          <p className={styles.error} role="alert">
            {error}
          </p>
        )}
        <div
          className={styles.viewport}
          ref={viewportRef}
          aria-label="เอกสารตั้งเบิก เลื่อนแนวนอนเพื่อแก้ไขทุกช่อง"
          tabIndex={0}
        >
          {!payment && mode === "choose" && (
            <section className={styles.modeChooser}>
              <span className={styles.eyebrow}>รายการตั้งเบิก</span>
              <h3>ต้องการทำรายการแบบไหนครับ?</h3>
              <p>เลือกประเภทก่อน แล้วค่อยกรอกข้อมูลที่เกี่ยวข้อง</p>
              <div className={styles.modeGrid}>
                <button
                  type="button"
                  className={styles.modeCard}
                  aria-label="สร้างงานใหม่"
                  onClick={() => setMode("new")}
                >
                  <span className={styles.modeIcon}>
                    <Icon name="plus" size={25} />
                  </span>
                  <strong>สร้างงานใหม่</strong>
                  <span>
                    เริ่มชุดงานใหม่ กรอกข้อมูลผู้รับจ้าง
                    <br />
                    และกำหนดแผนงวดครั้งแรก
                  </span>
                  <span className={styles.modeLink}>
                    เริ่มกรอกเอกสาร <Icon name="arrow" size={16} />
                  </span>
                </button>
                <button
                  type="button"
                  className={`${styles.modeCard} ${styles.resumeCard}`}
                  aria-label="เบิกงวดถัดไป"
                  onClick={() => setMode("resume")}
                >
                  <span className={styles.modeIcon}>
                    <Icon name="folder" size={25} />
                  </span>
                  <strong>เบิกงวดถัดไป</strong>
                  <span>
                    เลือกงานที่เคยบันทึกไว้
                    <br />
                    ใช้ข้อมูลเดิมและเบิกต่อจากแผน
                  </span>
                  <span className={styles.modeLink}>
                    เลือกงานเดิม <Icon name="arrow" size={16} />
                  </span>
                </button>
              </div>
              <div className={styles.flowTip}>
                <Icon name="check-circle" size={16} />
                ทุกงวดของงานเดียวกันจะเชื่อมกัน และเก็บเป็นเอกสารแยกแต่ละงวด
              </div>
            </section>
          )}
          {!payment && mode === "resume" && !loadedSource && (
            <WorkPlanPicker
              workspace={workspace}
              onSelect={loadWorkPlan}
              onNew={() => setMode("new")}
            />
          )}
          {showDocument && (
            <>
              {lockedWork && (
                <section
                  className={styles.linkedWork}
                  aria-label="เอกสารที่ผูกกับชุดงานเดิม"
                >
                  <div>
                    <strong>
                      ชุดงานเดิม · ขอเบิกงวดที่ {doc.installmentNumber} /{" "}
                      {plan.length}
                    </strong>
                    <p>
                      {doc.contractorName} → {projectName} →{" "}
                      {doc.workCategory || "ยังไม่ระบุหมวดงาน"}
                    </p>
                    <span>
                      งวดที่บันทึกแล้ว{" "}
                      {plan.filter((item) => item.paymentId).length} /{" "}
                      {plan.length} · ใช้ข้อมูลและยอดคงเหลือของชุดงานนี้
                    </span>
                  </div>
                  {!payment && (
                    <button
                      type="button"
                      className="button"
                      onClick={startNewWork}
                    >
                      เริ่มชุดงานใหม่ / เลือกงานอื่น
                    </button>
                  )}
                </section>
              )}
              {loadedSource && (
                <section
                  className={styles.claimReview}
                  aria-label="ตรวจสอบงวดที่จะเบิก"
                >
                  <div className={styles.reviewHeading}>
                    <span className={styles.modeIcon}>
                      <Icon name="check-circle" size={22} />
                    </span>
                    <div>
                      <h3>
                        {targetPayment
                          ? "แก้ไขงวดที่บันทึกแล้ว"
                          : "พร้อมเบิกงวดถัดไป"}
                      </h3>
                      <p>{description}</p>
                    </div>
                  </div>
                  <div className={styles.reviewFields}>
                    <label>
                      งวดที่จะบันทึก
                      <select
                        aria-label="งวดที่จะบันทึก"
                        value={doc.installmentNumber}
                        onChange={(event) =>
                          chooseInstallment(Number(event.target.value) - 1)
                        }
                      >
                        {plan.map((claim, index) => (
                          <option key={claim.id} value={index + 1}>
                            งวดที่ {index + 1} ·{" "}
                            {claim.paymentId ? "บันทึกแล้ว" : "ยังไม่เบิก"}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      วันที่ตั้งเบิก
                      <input
                        type="date"
                        aria-label="วันที่ขอเบิกงวดนี้"
                        value={requestedDate}
                        onChange={(event) =>
                          changeClaim(activeIndex, { date: event.target.value })
                        }
                        required
                      />
                    </label>
                    <label>
                      ยอดขอเบิกงวดนี้
                      <CurrencyField
                        label="ยอดขอเบิกงวดนี้"
                        value={doc.requestedAmount}
                        onChange={(value) => field("requestedAmount", value)}
                        required
                      />
                    </label>
                  </div>
                  <div className={styles.reviewTotals}>
                    <div>
                      <span>ยอดรับเงินหลังหัก</span>
                      <strong>฿{money(totals.net)}</strong>
                    </div>
                    <div>
                      <span>คงเหลือหลังเบิกงวดนี้</span>
                      <strong>฿{money(totals.remaining)}</strong>
                    </div>
                  </div>
                  <p className={styles.reviewNote}>
                    <Icon name="check" size={15} />
                    {targetPayment
                      ? "บันทึกเพื่อแก้ไขเอกสารงวดนี้"
                      : `บันทึกเฉพาะงวดที่ ${doc.installmentNumber} งวดอื่นยังคงอยู่ในแผน`}
                  </p>
                </section>
              )}
              <details className={styles.documentDetails} open={!loadedSource}>
                <summary hidden={!loadedSource}>
                  <Icon name="file-search" size={18} />
                  <span>ดูหรือแก้ไขเอกสารฉบับเต็ม</span>
                  <Icon name="chevron" size={16} />
                </summary>
                <div className={styles.paper}>
                  <div className={styles.documentHeader}>
                    <input
                      className={styles.documentTitle}
                      aria-label="ชื่อเอกสาร"
                      value={doc.title}
                      onChange={(event) => field("title", event.target.value)}
                      maxLength={80}
                      required
                    />
                    <label className={styles.documentDate}>
                      วันที่ตั้งเบิก
                      <span className={styles.dateEditor}>
                        <input
                          aria-label="วันที่ตั้งเบิก"
                          type="date"
                          value={requestedDate}
                          onChange={(event) =>
                            changeClaim(activeIndex, {
                              date: event.target.value,
                            })
                          }
                          required
                        />
                        <span aria-hidden="true">
                          {requestedDate
                            ? new Intl.DateTimeFormat("th-TH", {
                                day: "numeric",
                                month: "short",
                                year: "2-digit",
                                timeZone: "Asia/Bangkok",
                              }).format(
                                new Date(`${requestedDate}T12:00:00+07:00`),
                              )
                            : "เลือกวันที่"}
                        </span>
                      </span>
                    </label>
                    <svg
                      className={styles.logo}
                      viewBox="0 0 36 66"
                      aria-hidden="true"
                    >
                      <path
                        d="M8 3v27h20V3 M18 0v64 M8 17h20 M5 37h26 M9 45h18 M13 53h10"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                    </svg>
                  </div>
                  <div className={styles.twoColumns}>
                    <label className={styles.line}>
                      <span>ชื่อหน้างาน</span>
                      <input
                        aria-label="ชื่อหน้างาน"
                        list={`${id}-projects`}
                        value={projectName}
                        readOnly={lockedWork}
                        onChange={(event) => setProjectName(event.target.value)}
                        placeholder="เลือกหรือพิมพ์ชื่อหน้างาน"
                        maxLength={100}
                        required
                      />
                    </label>
                    <label className={styles.line}>
                      <span>ที่ตั้งหน้างาน</span>
                      <input
                        value={doc.siteAddress}
                        onChange={(event) =>
                          field("siteAddress", event.target.value)
                        }
                        maxLength={250}
                      />
                    </label>
                  </div>
                  <h3>ข้อมูลผู้รับจ้าง/ทีมช่าง</h3>
                  <div className={styles.twoColumns}>
                    <label className={styles.line}>
                      <span>ชื่อ-นามสกุล (ชื่อเล่น)</span>
                      <input
                        aria-label="ชื่อผู้รับจ้าง"
                        list={`${id}-creditors`}
                        value={doc.contractorName}
                        readOnly={lockedWork}
                        onChange={(event) =>
                          chooseContractor(event.target.value)
                        }
                        placeholder="เลือกหรือพิมพ์ชื่อผู้รับจ้าง"
                        maxLength={100}
                        required
                      />
                    </label>
                    <label className={styles.line}>
                      <span>เบอร์โทรติดต่อ</span>
                      <input
                        type="tel"
                        value={doc.phone}
                        onChange={(event) => field("phone", event.target.value)}
                        maxLength={25}
                      />
                    </label>
                    <label className={styles.line}>
                      <span>เลขบัตรประชาชน</span>
                      <input
                        inputMode="numeric"
                        value={doc.nationalId}
                        onChange={(event) =>
                          field("nationalId", event.target.value)
                        }
                        maxLength={25}
                      />
                    </label>
                    <label className={styles.line}>
                      <span>ที่อยู่ที่ติดต่อได้</span>
                      <input
                        value={doc.address}
                        onChange={(event) =>
                          field("address", event.target.value)
                        }
                        maxLength={250}
                      />
                    </label>
                  </div>
                  <div className={styles.nationality}>
                    <span>สัญชาติ</span>
                    <label>
                      <input
                        type="radio"
                        name="nationality"
                        checked={nationality === "ไทย"}
                        onChange={() => setNationality("ไทย")}
                      />
                      คนไทย
                    </label>
                    <label>
                      <input
                        type="radio"
                        name="nationality"
                        checked={nationality === "ต่างด้าว"}
                        onChange={() => setNationality("ต่างด้าว")}
                      />
                      คนต่างด้าว
                    </label>
                    {nationality === "ไทยใหญ่" && (
                      <label>
                        <input type="radio" checked readOnly />
                        ไทยใหญ่
                      </label>
                    )}
                  </div>
                  <h3>ข้อมูลการตั้งเบิก</h3>
                  <div className={styles.workRow}>
                    <label className={styles.line}>
                      <span>หมวดงาน</span>
                      <input
                        value={doc.workCategory}
                        readOnly={lockedWork}
                        required={!payment && !loadedSource}
                        onChange={(event) =>
                          field("workCategory", event.target.value)
                        }
                        placeholder="เช่น งานไฟฟ้า (งานเพิ่มเติม)"
                        maxLength={150}
                      />
                    </label>
                    <span>รายละเอียดงาน</span>
                  </div>
                  <textarea
                    className={styles.description}
                    aria-label="รายละเอียดงาน"
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    rows={2}
                    maxLength={1000}
                    required
                    placeholder="คลิกเพื่อกรอกรายละเอียดงานที่ตั้งเบิก"
                  />
                  <div className={styles.finance}>
                    <strong className={styles.totalLabel}>
                      มูลค่างานทั้งหมด
                    </strong>
                    <div className={styles.totalValue}>
                      <CurrencyField
                        label="มูลค่างานทั้งหมด"
                        value={doc.totalWorkAmount}
                        onChange={(value) => field("totalWorkAmount", value)}
                        required
                      />
                      <span>บาท</span>
                    </div>
                    <div className={styles.pricing}>
                      <select
                        aria-label="รูปแบบ VAT"
                        value={doc.vatMode}
                        onChange={(event) =>
                          field(
                            "vatMode",
                            event.target.value as PaymentDocument["vatMode"],
                          )
                        }
                      >
                        <option value="none">Non-VAT</option>
                        <option value="exclusive">
                          VAT 7% เพิ่มจากยอดเบิก
                        </option>
                        <option value="inclusive">VAT 7% รวมในยอดเบิก</option>
                      </select>
                      <div>
                        <label>
                          <input
                            type="radio"
                            name="category"
                            checked={category === "ค่าแรง+ของ"}
                            onChange={() => setCategory("ค่าแรง+ของ")}
                          />
                          ราคาค่าของ+ค่าแรง
                        </label>
                        <label>
                          <input
                            type="radio"
                            name="category"
                            checked={category === "ค่าแรง"}
                            onChange={() => setCategory("ค่าแรง")}
                          />
                          ราคาเฉพาะค่าแรง
                        </label>
                      </div>
                    </div>
                    <div className={styles.installment}>
                      <strong>ขอเบิกงวดที่</strong>
                      <select
                        aria-label="งวดที่เบิก"
                        value={doc.installmentNumber}
                        onChange={(event) =>
                          chooseInstallment(Number(event.target.value) - 1)
                        }
                      >
                        {plan.map((item, index) => (
                          <option key={item.id} value={index + 1}>
                            {index + 1}
                          </option>
                        ))}
                      </select>
                      <span>/ {plan.length}</span>
                    </div>
                    <div className={styles.ledger}>
                      <div className={styles.request}>
                        <span>จำนวนเงิน</span>
                        <CurrencyField
                          label="จำนวนเงินที่ขอเบิก"
                          value={doc.requestedAmount}
                          onChange={(value) => field("requestedAmount", value)}
                          required
                        />
                        <span>บาท</span>
                      </div>
                      <div>
                        <span>ค่าบริการ ก่อน VAT</span>
                        <output aria-label="ค่าบริการก่อน VAT">
                          {money(totals.base)}
                        </output>
                        <span>บาท</span>
                      </div>
                      <div>
                        <span>VAT 7%</span>
                        <output aria-label="ยอด VAT">
                          {totals.vat ? money(totals.vat) : "-"}
                        </output>
                        <span>บาท</span>
                      </div>
                      <div>
                        <label>
                          หัก ณ ที่จ่าย{" "}
                          <input
                            className={styles.rate}
                            aria-label="เปอร์เซ็นต์หัก ณ ที่จ่าย"
                            type="number"
                            min={0}
                            max={100}
                            step="0.01"
                            value={doc.withholdingRate}
                            onChange={(event) =>
                              field(
                                "withholdingRate",
                                Number(event.target.value),
                              )
                            }
                          />
                          %
                        </label>
                        <output aria-label="ยอดหัก ณ ที่จ่าย">
                          {totals.withholding ? money(totals.withholding) : "-"}
                        </output>
                        <span>บาท</span>
                      </div>
                      <div>
                        <label>
                          หักประกัน{" "}
                          <input
                            className={styles.rate}
                            aria-label="เปอร์เซ็นต์เงินประกัน"
                            type="number"
                            min={0}
                            max={100}
                            step="0.01"
                            value={doc.retentionRate}
                            onChange={(event) =>
                              field("retentionRate", Number(event.target.value))
                            }
                          />
                          %
                        </label>
                        <output aria-label="ยอดหักประกัน">
                          {totals.retention ? money(totals.retention) : "-"}
                        </output>
                        <span>บาท</span>
                      </div>
                      <div className={styles.net}>
                        <strong>ยอดรับเงิน</strong>
                        <output aria-label="ยอดรับเงิน">
                          {money(totals.net)}
                        </output>
                        <strong>บาท</strong>
                      </div>
                    </div>
                    <div className={styles.remaining}>
                      <select
                        aria-label="การหักประกัน"
                        value={doc.retentionEnabled ? "yes" : "no"}
                        onChange={(event) =>
                          field(
                            "retentionEnabled",
                            event.target.value === "yes",
                          )
                        }
                      >
                        <option value="no">ไม่มีประกัน</option>
                        <option value="yes">หักประกัน</option>
                      </select>
                      <div>
                        <strong>คงเหลือ</strong>
                        <output aria-label="ยอดคงเหลือ">
                          {money(totals.remaining)}
                        </output>
                        <span>บาท</span>
                      </div>
                    </div>
                  </div>
                  <section
                    className={styles.plan}
                    aria-label="แผนการเบิกหลายงวด"
                  >
                    <div className={styles.planHead}>
                      <div>
                        <h3>แผนการเบิก · {plan.length} งวด</h3>
                        <p>
                          เลือกงวดที่ขอเบิก บันทึกเฉพาะงวดที่เลือก
                          งวดอื่นเก็บเป็นแผนไว้
                        </p>
                      </div>
                      <button
                        type="button"
                        className={styles.addInstallment}
                        onClick={() => {
                          setPlan((current) => [
                            ...current,
                            {
                              id: crypto.randomUUID(),
                              amount: 0,
                              date: today(),
                              paymentId: undefined,
                            },
                          ]);
                          field("totalInstallments", plan.length + 1);
                        }}
                      >
                        + เพิ่มงวด
                      </button>
                    </div>
                    {plan.map((claim, index) => (
                      <div
                        key={claim.id}
                        className={`${styles.planRow} ${index === activeIndex ? styles.activeInstallment : ""}`}
                      >
                        <button
                          type="button"
                          aria-label={`เลือกขอเบิกงวดที่ ${index + 1}`}
                          aria-pressed={index === activeIndex}
                          onClick={() => chooseInstallment(index)}
                        >
                          งวดที่ {index + 1}
                        </button>
                        <input
                          type="date"
                          aria-label={`วันที่ตั้งเบิกงวดที่ ${index + 1}`}
                          value={claim.date}
                          disabled={!!claim.paymentId && index !== activeIndex}
                          onChange={(event) =>
                            changeClaim(index, { date: event.target.value })
                          }
                        />
                        <CurrencyField
                          label={`ยอดเบิกงวดที่ ${index + 1}`}
                          value={claim.amount}
                          disabled={!!claim.paymentId && index !== activeIndex}
                          onChange={(amount) => changeClaim(index, { amount })}
                        />
                        <span>บาท</span>
                        <span>
                          {index === activeIndex
                            ? "กำลังขอเบิก"
                            : claim.paymentId
                              ? "บันทึกแล้ว"
                              : "ยังไม่ขอเบิก"}
                        </span>
                        {index === plan.length - 1 &&
                          plan.length > 1 &&
                          !claim.paymentId && (
                            <button
                              type="button"
                              className={styles.removeInstallment}
                              aria-label={`ลบแผนงวดที่ ${index + 1}`}
                              onClick={() => {
                                if (index === activeIndex)
                                  chooseInstallment(index - 1);
                                setPlan((current) => current.slice(0, -1));
                                field("totalInstallments", plan.length - 1);
                              }}
                            >
                              ลบ
                            </button>
                          )}
                      </div>
                    ))}
                    <div className={styles.planFooter}>
                      ยอดตามแผนทั้งหมด <strong>฿{money(plannedTotal)}</strong>
                      <span>
                        คงเหลือที่ยังไม่ได้แบ่งงวด ฿
                        {money(
                          doc.totalWorkAmount -
                            doc.previousClaimed -
                            plannedTotal,
                        )}
                      </span>
                    </div>
                  </section>
                  <div className={styles.bankRow}>
                    <label className={styles.line}>
                      <span>บัญชีธนาคาร</span>
                      <input
                        list={`${id}-banks`}
                        value={bank}
                        onChange={(event) => setBank(event.target.value)}
                        maxLength={100}
                      />
                    </label>
                    <label className={styles.line}>
                      <span>สาขา</span>
                      <input
                        value={branch}
                        onChange={(event) => setBranch(event.target.value)}
                        maxLength={100}
                      />
                    </label>
                    <label className={styles.line}>
                      <span>เลขที่บัญชี</span>
                      <input
                        inputMode="numeric"
                        value={accountNumber}
                        onChange={(event) =>
                          setAccountNumber(event.target.value)
                        }
                        maxLength={30}
                      />
                    </label>
                    <label className={styles.line}>
                      <span>ชื่อบัญชีผู้รับเงิน</span>
                      <input
                        value={accountName}
                        onChange={(event) => setAccountName(event.target.value)}
                        maxLength={150}
                      />
                    </label>
                  </div>
                  <div className={styles.twoColumns}>
                    <label className={styles.line}>
                      <span>ผู้ควบคุมงาน/ผู้ตั้งเบิก</span>
                      <input
                        value={doc.supervisor}
                        onChange={(event) =>
                          field("supervisor", event.target.value)
                        }
                        maxLength={150}
                      />
                    </label>
                    <label className={styles.line}>
                      <span>ผู้อนุมัติจ่าย</span>
                      <input
                        value={doc.approver}
                        onChange={(event) =>
                          field("approver", event.target.value)
                        }
                        maxLength={150}
                      />
                    </label>
                  </div>
                  <datalist id={`${id}-projects`}>
                    {workspace.projects.map((item) => (
                      <option key={item.id} value={item.name} />
                    ))}
                  </datalist>
                  <datalist id={`${id}-creditors`}>
                    {workspace.creditors.map((item) => (
                      <option key={item.id} value={item.name} />
                    ))}
                  </datalist>
                  <datalist id={`${id}-banks`}>
                    {[
                      "กรุงไทย",
                      "กสิกรไทย",
                      "ไทยพาณิชย์",
                      "กรุงเทพ",
                      "ออมสิน",
                    ].map((name) => (
                      <option key={name} value={name} />
                    ))}
                  </datalist>
                </div>
                <details className={styles.additional}>
                  <summary>รายละเอียดเพิ่มเติม</summary>
                  <div>
                    <label>
                      ยอดเบิกก่อนแผนนี้ (ไม่รวมงวดที่บันทึกแล้วในแผน)
                      <CurrencyField
                        label="ยอดเบิกก่อนหน้า"
                        value={doc.previousClaimed}
                        onChange={(value) => field("previousClaimed", value)}
                      />
                    </label>
                    {status === "จ่ายแล้ว" && (
                      <label>
                        วันที่ชำระ
                        <input
                          type="date"
                          value={paidDate}
                          onChange={(event) => setPaidDate(event.target.value)}
                          required
                        />
                      </label>
                    )}
                    {!["ค่าแรง", "ค่าแรง+ของ"].includes(category) && (
                      <label>
                        รูปแบบเดิม
                        <select
                          value={category}
                          onChange={(event) => setCategory(event.target.value)}
                        >
                          <option>ค่าวัสดุ</option>
                          <option>ค่าบริการ</option>
                        </select>
                      </label>
                    )}
                    <label>
                      หมายเหตุ
                      <textarea
                        value={note}
                        onChange={(event) => setNote(event.target.value)}
                        rows={2}
                        maxLength={500}
                      />
                    </label>
                    <label className={styles.flow}>
                      <input
                        type="checkbox"
                        checked={flow}
                        onChange={(event) => setFlow(event.target.checked)}
                      />
                      ลง Flow
                    </label>
                  </div>
                </details>
              </details>
            </>
          )}
        </div>
        <div className={styles.actions}>
          {showDocument ? (
            <span>
              ยอดรับเงิน <strong>฿{money(totals.net)}</strong>
            </span>
          ) : (
            <span>
              เลือก
              {mode === "resume"
                ? "งานเดิมที่ต้องการเบิกต่อ"
                : "ประเภทของรายการเพื่อเริ่มต้น"}
            </span>
          )}
          <div>
            <button type="button" className="button" disabled={saving} onClick={onClose}>
              ยกเลิก
            </button>
            {showDocument && (
              <button type="submit" className="button button-primary" disabled={saving || loading || !connected}>
                {saving ? "กำลังบันทึก…" : targetPayment
                  ? "บันทึกการแก้ไข"
                  : `บันทึกขอเบิกงวดที่ ${doc.installmentNumber}`}
              </button>
            )}
          </div>
        </div>
      </form>
    </Modal>
  );
}
