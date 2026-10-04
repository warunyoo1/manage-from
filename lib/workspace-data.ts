import { initialWorkspace } from "@/lib/demo-data";
import { isPaymentStatus } from "@/lib/payment-status";
import { isPaymentDocument } from "@/lib/payment-document";
import type { Creditor, Payment, Project, Workspace } from "@/types/workspace";

type LegacyPayment = Omit<Payment, "creditorId">;
const paymentStrings = [
  "id",
  "projectId",
  "requestedDate",
  "creditor",
  "description",
  "installment",
  "nationality",
  "category",
  "bank",
  "branch",
  "accountNumber",
  "accountName",
  "paidDate",
  "note",
] as const;

function record(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object";
}

function isEntity(value: unknown): value is Project {
  return (
    record(value) &&
    ["id", "name", "description", "color"].every(
      (key) => typeof value[key] === "string",
    ) &&
    ["blue", "amber", "purple", "cyan", "rose"].includes(String(value.color)) &&
    typeof value.favorite === "boolean"
  );
}

function isPayment(value: unknown): value is LegacyPayment {
  return (
    record(value) &&
    paymentStrings.every((key) => typeof value[key] === "string") &&
    typeof value.amount === "number" &&
    Number.isFinite(value.amount) &&
    value.amount >= 0 &&
    typeof value.flow === "boolean" &&
    isPaymentStatus(value.status) &&
    (value.document === undefined || isPaymentDocument(value.document))
  );
}

export function normalizeCreditorName(name: string) {
  return name.trim().replace(/\s+/g, " ").toLocaleLowerCase("th");
}

/** Keep every payment and project when converting the project-based prototype. */
export function parseWorkspace(value: unknown): Workspace | null {
  if (
    !record(value) ||
    !Array.isArray(value.projects) ||
    !value.projects.every(isEntity) ||
    !Array.isArray(value.payments) ||
    !value.payments.every(isPayment)
  )
    return null;

  if (Array.isArray(value.creditors) && value.creditors.every(isEntity)) {
    const projects = value.projects as Project[];
    const creditors = value.creditors as Creditor[];
    const payments = value.payments;
    if (
      !payments.every((p) => {
        const payment = p as LegacyPayment & { creditorId?: unknown };
        return (
          typeof payment.creditorId === "string" &&
          creditors.some((c) => c.id === payment.creditorId) &&
          projects.some((project) => project.id === payment.projectId)
        );
      })
    )
      return null;
    return { projects, creditors, payments: payments as Payment[] };
  }

  // Older records identify a creditor by name. Assign a stable ID without
  // merging different projects or work descriptions into a single payment.
  const creditors: Creditor[] = [];
  const payments = value.payments.map((payment) => {
    const normalized = normalizeCreditorName(payment.creditor);
    let creditor = creditors.find(
      (item) => normalizeCreditorName(item.name) === normalized,
    );
    if (!creditor) {
      const sample = initialWorkspace.creditors.find(
        (item) => normalizeCreditorName(item.name) === normalized,
      );
      creditor = sample
        ? { ...sample }
        : {
            id: `migrated-creditor-${creditors.length + 1}`,
            name: payment.creditor.trim(),
            description: "",
            color: "blue",
            favorite: false,
          };
      creditors.push(creditor);
    }
    return { ...payment, creditorId: creditor.id };
  });
  return { projects: value.projects, creditors, payments };
}
