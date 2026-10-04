import type { Payment } from "@/types/workspace";
import { normalizeCreditorName } from "@/lib/workspace-data";
import { defaultDocument, installmentPlan } from "@/lib/payment-document";

/** Labels narrow the choices; the saved group ID identifies the actual work. */
export function savedWorkPlans(
  payments: Payment[],
  creditorId?: string,
  projectId?: string,
  workCategory?: string,
) {
  const groups = new Map<string, Payment>();
  for (const payment of payments) {
    const groupId = payment.document?.installmentGroupId;
    if (!groupId || !payment.document?.installments) continue;
    if (creditorId && payment.creditorId !== creditorId) continue;
    if (projectId && payment.projectId !== projectId) continue;
    if (
      workCategory !== undefined &&
      normalizeCreditorName(payment.document.workCategory) !==
        normalizeCreditorName(workCategory)
    )
      continue;
    groups.set(groupId, payment);
  }
  return [...groups.values()];
}

export function resumeWorkPlan(payment: Payment) {
  const plan = installmentPlan(payment);
  const firstUnclaimed = plan.findIndex((item) => !item.paymentId);
  const index = firstUnclaimed < 0 ? plan.length - 1 : firstUnclaimed;
  const doc = defaultDocument(payment);
  return {
    plan,
    index,
    document: {
      ...doc,
      previousClaimed:
        doc.installmentBaseClaimed ??
        Math.max(
          0,
          doc.previousClaimed -
            plan
              .filter(
                (item, i) => item.paymentId && i !== doc.installmentNumber - 1,
              )
              .reduce((sum, item) => sum + item.amount, 0),
        ),
      installmentNumber: index + 1,
      requestedAmount: plan[index].amount,
    },
  };
}
