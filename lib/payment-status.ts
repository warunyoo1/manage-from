import type { Payment, PaymentStatus } from "@/types/workspace";

export type StatusFilter = PaymentStatus | "all";
export const paymentStatuses = [
  {
    value: "จ่ายแล้ว",
    label: "จ่าย",
    tone: "paid",
    slug: "paid",
    description: "รายการที่ชำระเรียบร้อยแล้ว",
  },
  {
    value: "ค้างจ่าย",
    label: "ค้างจ่าย",
    tone: "pending",
    slug: "pending",
    description: "รายการที่รอดำเนินการชำระ",
  },
  {
    value: "หน้างานถูกชะลอ",
    label: "หน้างานถูกชะลอ",
    tone: "paused",
    slug: "paused",
    description: "รายการของงานที่ถูกชะลอไว้",
  },
  {
    value: "ตรวจสอบเพิ่มเติม",
    label: "ตรวจสอบเพิ่มเติม",
    tone: "review",
    slug: "review",
    description: "รายการที่ต้องตรวจสอบรายละเอียดเพิ่มเติม",
  },
] as const;

export function isPaymentStatus(value: unknown): value is PaymentStatus {
  return paymentStatuses.some((status) => status.value === value);
}

export function statusLabel(status: PaymentStatus) {
  return paymentStatuses.find((item) => item.value === status)!.label;
}

export function paymentsForStatus(payments: Payment[], status: PaymentStatus) {
  return payments.filter((payment) => payment.status === status);
}
