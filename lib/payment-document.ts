import type { Payment, PaymentDocument } from "@/types/workspace";

const round = (amount: number) =>
  Math.round((amount + Number.EPSILON) * 100) / 100;

export function installmentPlan(payment?: Payment) {
  const doc = defaultDocument(payment);
  if (doc.installments) return doc.installments.map((item) => ({ ...item }));
  return Array.from({ length: doc.totalInstallments }, (_, index) => ({
    id: `installment-${index + 1}`,
    amount: index + 1 === doc.installmentNumber ? doc.requestedAmount : 0,
    date: payment?.requestedDate ?? "",
    paymentId: index + 1 === doc.installmentNumber ? payment?.id : undefined,
  }));
}

export function documentForInstallment(
  document: PaymentDocument,
  plan: NonNullable<PaymentDocument["installments"]>,
  installmentNumber: number,
) {
  return {
    ...document,
    installmentNumber,
    totalInstallments: plan.length,
    requestedAmount: plan[installmentNumber - 1].amount,
    previousClaimed: round(
      document.previousClaimed +
        plan
          .filter(
            (item, index) => item.paymentId && index !== installmentNumber - 1,
          )
          .reduce((sum, item) => sum + item.amount, 0),
    ),
  };
}

/** Rates and VAT mode are entered on the document; no tax eligibility is inferred. */
export function documentTotals(document: PaymentDocument) {
  const base =
    document.vatMode === "inclusive"
      ? round(document.requestedAmount / 1.07)
      : document.requestedAmount;
  const vat =
    document.vatMode === "none"
      ? 0
      : document.vatMode === "inclusive"
        ? round(document.requestedAmount - base)
        : round(base * 0.07);
  const gross =
    document.vatMode === "exclusive"
      ? round(base + vat)
      : document.requestedAmount;
  const withholding = round((base * document.withholdingRate) / 100);
  const retention = document.retentionEnabled
    ? round((base * document.retentionRate) / 100)
    : 0;
  return {
    base,
    vat,
    withholding,
    retention,
    net: round(gross - withholding - retention),
    remaining: round(
      document.totalWorkAmount -
        document.previousClaimed -
        document.requestedAmount,
    ),
  };
}

export function defaultDocument(payment?: Payment): PaymentDocument {
  if (payment?.document)
    return {
      ...payment.document,
      installments: payment.document.installments?.map((item) => ({ ...item })),
    };
  const [installment, total] = (payment?.installment ?? "1/1")
    .split("/")
    .map(Number);
  return {
    title: "รายการตั้งเบิก ตรีพิลเอิร์ธ",
    siteAddress: "",
    contractorName: payment?.creditor ?? "",
    nationalId: "",
    phone: "",
    address: "",
    workCategory: "",
    totalWorkAmount: payment?.amount ?? 0,
    requestedAmount: payment?.amount ?? 0,
    previousClaimed: 0,
    vatMode: "none",
    withholdingRate: payment ? 0 : 3,
    retentionEnabled: false,
    retentionRate: 5,
    installmentNumber:
      Number.isInteger(installment) && installment > 0 ? installment : 1,
    totalInstallments: Number.isInteger(total) && total > 0 ? total : 1,
    supervisor: "",
    approver: "",
  };
}

export function isPaymentDocument(value: unknown): value is PaymentDocument {
  if (!value || typeof value !== "object") return false;
  const doc = value as Record<string, unknown>;
  return (
    (doc.installmentBaseClaimed === undefined ||
      (typeof doc.installmentBaseClaimed === "number" &&
        Number.isFinite(doc.installmentBaseClaimed) &&
        doc.installmentBaseClaimed >= 0)) &&
    (doc.installmentGroupId === undefined ||
      typeof doc.installmentGroupId === "string") &&
    (doc.installments === undefined ||
      (Array.isArray(doc.installments) &&
        doc.installments.length === doc.totalInstallments &&
        new Set(doc.installments.map((item) => item?.id)).size ===
          doc.installments.length &&
        doc.installments.every(
          (item) =>
            item &&
            typeof item.id === "string" &&
            typeof item.amount === "number" &&
            Number.isFinite(item.amount) &&
            item.amount >= 0 &&
            typeof item.date === "string" &&
            (item.paymentId === undefined ||
              typeof item.paymentId === "string"),
        ))) &&
    [
      "title",
      "siteAddress",
      "contractorName",
      "nationalId",
      "phone",
      "address",
      "workCategory",
      "supervisor",
      "approver",
    ].every((key) => typeof doc[key] === "string") &&
    [
      "totalWorkAmount",
      "requestedAmount",
      "previousClaimed",
      "withholdingRate",
      "retentionRate",
      "installmentNumber",
      "totalInstallments",
    ].every(
      (key) =>
        typeof doc[key] === "number" &&
        Number.isFinite(doc[key]) &&
        doc[key] >= 0,
    ) &&
    ["none", "exclusive", "inclusive"].includes(String(doc.vatMode)) &&
    typeof doc.retentionEnabled === "boolean" &&
    Number.isInteger(doc.installmentNumber) &&
    Number.isInteger(doc.totalInstallments) &&
    Number(doc.installmentNumber) >= 1 &&
    Number(doc.totalInstallments) >= Number(doc.installmentNumber) &&
    Number(doc.withholdingRate) <= 100 &&
    Number(doc.retentionRate) <= 100
  );
}
