import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import ts from "typescript";
const dependencyRequire = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cache = new Map();
function load(relative) {
  const filename = path.join(root, relative);
  if (cache.has(filename)) return cache.get(filename).exports;
  const loaded = { exports: {} };
  cache.set(filename, loaded);
  const source = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  new Function("require", "module", "exports", source)(
    (id) =>
      id.startsWith("@/") ? load(`${id.slice(2)}.ts`) : dependencyRequire(id),
    loaded,
    loaded.exports,
  );
  return loaded.exports;
}

const { initialWorkspace, paymentSummary } = load("lib/demo-data.ts");
const { parseWorkspace } = load("lib/workspace-data.ts");
const { paymentsForStatus, paymentStatuses } = load("lib/payment-status.ts");
const { savedWorkPlans, resumeWorkPlan } = load("lib/work-plans.ts");
const {
  defaultDocument,
  documentTotals,
  isPaymentDocument,
  installmentPlan,
  documentForInstallment,
} = load("lib/payment-document.ts");
const reference = {
  ...defaultDocument(),
  totalWorkAmount: 6200,
  requestedAmount: 3100,
  totalInstallments: 2,
};
assert.deepEqual(
  documentTotals(reference),
  {
    base: 3100,
    vat: 0,
    withholding: 93,
    retention: 0,
    net: 3007,
    remaining: 3100,
  },
  "Reference document: 6200 total, 3100 claim, 3% withholding gives 3007 net",
);
assert.equal(
  documentTotals({ ...reference, retentionEnabled: true }).net,
  2852,
  "5% retention reduces net by 155",
);
assert.deepEqual(documentTotals({ ...reference, vatMode: "exclusive" }), {
  base: 3100,
  vat: 217,
  withholding: 93,
  retention: 0,
  net: 3224,
  remaining: 3100,
});
assert.equal(
  documentTotals({ ...reference, vatMode: "inclusive", requestedAmount: 3317 })
    .net,
  3224,
);
assert.equal(
  documentTotals({ ...reference, previousClaimed: 1000 }).remaining,
  2100,
);
assert.equal(
  documentTotals(defaultDocument(initialWorkspace.payments[0])).net,
  initialWorkspace.payments[0].amount,
  "Opening legacy rows must not apply new deductions",
);
assert.equal(isPaymentDocument({ ...reference, withholdingRate: 101 }), false);
assert.equal(isPaymentDocument({ ...reference, installmentNumber: 3 }), false);
const clone = structuredClone(initialWorkspace);
assert.deepEqual(
  parseWorkspace(clone),
  initialWorkspace,
  "Existing browser data keeps all rows, IDs and amounts",
);
for (const { value } of paymentStatuses) {
  clone.payments[0].status = value;
  const restored = parseWorkspace(JSON.parse(JSON.stringify(clone)));
  assert.ok(restored, `Saved ${value} data is accepted`);
  assert.equal(restored.payments[0].status, value);
  assert.equal(restored.payments.length, initialWorkspace.payments.length);
}
clone.payments[0].status = "unknown";
assert.equal(parseWorkspace(clone), null);
const records = paymentStatuses.map(({ value }, index) => ({
  ...initialWorkspace.payments[0],
  id: `status-${index}`,
  status: value,
  amount: (index + 1) * 100,
}));
assert.deepEqual(
  paymentSummary(records),
  { total: 1000, paid: 100, pending: 900, progress: 10 },
  "Paused/review rows remain unpaid",
);
for (const { value } of paymentStatuses) {
  const group = paymentsForStatus(records, value);
  assert.equal(group.length, 1, "Cards group records by their exact status");
  assert.equal(group[0].status, value);
}
const groups = paymentStatuses.map(({ value }) =>
  paymentsForStatus(initialWorkspace.payments, value),
);
assert.equal(
  groups.flat().length,
  initialWorkspace.payments.length,
  "Every row belongs to exactly one status card",
);
assert.equal(
  new Set(groups.flat().map((item) => item.id)).size,
  initialWorkspace.payments.length,
);
const pendingRows = paymentsForStatus(initialWorkspace.payments, "ค้างจ่าย");
assert.ok(
  new Set(pendingRows.map((item) => item.creditorId)).size > 1,
  "A status table includes multiple creditors",
);
assert.ok(
  new Set(pendingRows.map((item) => item.projectId)).size > 1,
  "A status table includes multiple projects",
);
assert.equal(paymentsForStatus([], "ค้างจ่าย").length, 0);
const moved = records.map((item) =>
  item.status === "ค้างจ่าย" ? { ...item, status: "หน้างานถูกชะลอ" } : item,
);
assert.equal(paymentsForStatus(moved, "ค้างจ่าย").length, 0);
assert.equal(
  paymentsForStatus(moved, "หน้างานถูกชะลอ").length,
  2,
  "Changing status moves the row between cards",
);

const saved = new Map([
  ["manage-from.workspace.v2", JSON.stringify(initialWorkspace)],
]);
const { applyWorkspaceAction } = load("lib/workspace-actions.ts");
let workspace = structuredClone(initialWorkspace);
function persist(action) {
  workspace = applyWorkspaceAction(workspace, action);
  saved.set("manage-from.workspace.v2", JSON.stringify(workspace));
}
const updatePayment = (id, changes) => persist({ type: "update-payment", id, changes });
const savePayment = (payment, newProject, newCreditor) => persist({ type: "save-payment", payment, newProject, newCreditor });
const addPayment = (payment, newProject, newCreditor) => persist({ type: "add-payment", payment, newProject, newCreditor });
const paidRecord = initialWorkspace.payments.find(
  (item) => item.status === "จ่ายแล้ว",
);
updatePayment(paidRecord.id, { status: "หน้างานถูกชะลอ", paidDate: "" });
let persisted = parseWorkspace(
  JSON.parse(saved.get("manage-from.workspace.v2")),
);
assert.ok(persisted);
assert.equal(
  persisted.payments.find((item) => item.id === paidRecord.id).paidDate,
  "",
);
updatePayment(paidRecord.id, { status: "ตรวจสอบเพิ่มเติม" });
persisted = parseWorkspace(JSON.parse(saved.get("manage-from.workspace.v2")));
assert.equal(
  persisted.payments.find((item) => item.id === paidRecord.id).status,
  "ตรวจสอบเพิ่มเติม",
);
const before = saved.get("manage-from.workspace.v2");
assert.throws(() => updatePayment(paidRecord.id, { status: "unknown" }));
assert.equal(
  saved.get("manage-from.workspace.v2"),
  before,
  "Invalid updates do not overwrite saved data",
);
const existing = initialWorkspace.payments[0];
savePayment({
  ...existing,
  document: reference,
  amount: 3007,
  description: "Edited document",
});
let documentSaved = parseWorkspace(
  JSON.parse(saved.get("manage-from.workspace.v2")),
);
assert.ok(documentSaved);
assert.equal(
  documentSaved.payments.length,
  initialWorkspace.payments.length,
  "Editing does not duplicate rows",
);
assert.deepEqual(
  documentSaved.payments.find((item) => item.id === existing.id).document,
  reference,
);
assert.equal(
  documentSaved.payments.find((item) => item.id === existing.id).amount,
  3007,
);
const unchanged = saved.get("manage-from.workspace.v2");
assert.throws(() => savePayment({ ...existing, id: "missing-id" }));
assert.equal(saved.get("manage-from.workspace.v2"), unchanged);
const newCreditor = {
  id: "document-creditor",
  name: "Document creditor",
  description: "",
  color: "cyan",
  favorite: false,
};
const newProject = {
  id: "document-project",
  name: "Document site",
  description: "",
  color: "cyan",
  favorite: false,
};
addPayment(
  {
    ...existing,
    id: "new-document",
    creditorId: newCreditor.id,
    projectId: newProject.id,
    document: reference,
    amount: 3007,
  },
  newProject,
  newCreditor,
);
documentSaved = parseWorkspace(
  JSON.parse(saved.get("manage-from.workspace.v2")),
);
assert.ok(documentSaved);
assert.equal(
  documentSaved.payments.length,
  initialWorkspace.payments.length + 1,
);
assert.equal(
  documentSaved.payments.find((item) => item.id === "new-document").creditor,
  newCreditor.name,
);
assert.ok(documentSaved.creditors.some((item) => item.id === newCreditor.id));
assert.ok(documentSaved.projects.some((item) => item.id === newProject.id));

const plan = [
  {
    id: "plan-1",
    amount: 2000,
    date: "2026-10-04",
    paymentId: "plan-payment-1",
  },
  { id: "plan-2", amount: 2500, date: "2026-11-04" },
  { id: "plan-3", amount: 1700, date: "2026-12-04" },
];
const planTemplate = {
  ...reference,
  previousClaimed: 0,
  totalInstallments: 3,
  installmentGroupId: "claim-plan",
  installmentBaseClaimed: 0,
  installments: plan,
};
const firstClaim = documentForInstallment(planTemplate, plan, 1);
const planFirstPayment = {
  ...existing,
  id: "plan-payment-1",
  amount: documentTotals(firstClaim).net,
  document: firstClaim,
  installment: "1/3",
  requestedDate: plan[0].date,
};
const beforePlanCount = documentSaved.payments.length;
addPayment(planFirstPayment);
let planSaved = parseWorkspace(
  JSON.parse(saved.get("manage-from.workspace.v2")),
);
assert.equal(
  planSaved.payments.length,
  beforePlanCount + 1,
  "Saving a three-installment plan creates only the selected payment",
);
assert.equal(
  planSaved.payments.find((item) => item.id === "plan-payment-1").amount,
  1940,
  "Only the selected 2000 claim, less withholding, is included in payable totals",
);
const restoredPlan = installmentPlan(
  planSaved.payments.find((item) => item.id === "plan-payment-1"),
);
assert.deepEqual(
  restoredPlan,
  plan,
  "All future planned amounts and dates survive reload",
);
const futureClaim = documentForInstallment(planTemplate, restoredPlan, 3);
assert.equal(
  futureClaim.previousClaimed,
  2000,
  "An unclaimed planned installment does not consume the actual balance",
);
assert.equal(documentTotals(futureClaim).remaining, 2500);
const secondPlan = restoredPlan.map((item, index) =>
  index === 1 ? { ...item, paymentId: "plan-payment-2" } : item,
);
const secondClaim = {
  ...documentForInstallment(planTemplate, secondPlan, 2),
  installments: secondPlan,
};
addPayment({
  ...planFirstPayment,
  id: "plan-payment-2",
  installment: "2/3",
  document: secondClaim,
  amount: documentTotals(secondClaim).net,
  requestedDate: plan[1].date,
});
planSaved = parseWorkspace(JSON.parse(saved.get("manage-from.workspace.v2")));
assert.equal(planSaved.payments.length, beforePlanCount + 2);
assert.equal(
  planSaved.payments.find((item) => item.id === "plan-payment-1").document
    .installments[1].paymentId,
  "plan-payment-2",
  "Earlier documents also know which future installments have been claimed",
);
assert.equal(
  planSaved.payments.find((item) => item.id === "plan-payment-2").amount,
  2425,
);
assert.equal(
  documentForInstallment(planTemplate, secondPlan, 3).previousClaimed,
  4500,
);
assert.equal(
  documentTotals(documentForInstallment(planTemplate, secondPlan, 1)).remaining,
  1700,
  "Reopening an earlier claim counts other saved installments, regardless of claim order",
);
savePayment({
  ...planSaved.payments.find((item) => item.id === "plan-payment-2"),
  note: "Edited installment",
});
assert.equal(
  parseWorkspace(JSON.parse(saved.get("manage-from.workspace.v2"))).payments
    .length,
  beforePlanCount + 2,
  "Editing an already claimed installment does not create a duplicate",
);
assert.equal(
  isPaymentDocument({
    ...firstClaim,
    installments: [{ id: "bad", amount: -1, date: "" }],
  }),
  false,
);
const savedSource = planSaved.payments.find(
  (item) => item.id === "plan-payment-1",
);
const resumed = resumeWorkPlan(savedSource);
assert.equal(
  resumed.document.installmentNumber,
  3,
  "Resuming a group with two claims chooses installment 3",
);
assert.equal(
  documentTotals(documentForInstallment(resumed.document, resumed.plan, 3))
    .remaining,
  0,
);
const oneClaimSource = {
  ...savedSource,
  document: { ...savedSource.document, installments: plan },
};
assert.equal(
  resumeWorkPlan(oneClaimSource).document.installmentNumber,
  2,
  "After the first claim, a new document resumes installment 2 of the same work",
);
const otherOwner = {
  ...savedSource,
  creditorId: "other-owner",
  document: { ...savedSource.document, installmentGroupId: "other-owner-plan" },
};
const otherSite = {
  ...savedSource,
  projectId: "other-site",
  document: { ...savedSource.document, installmentGroupId: "other-site-plan" },
};
const otherCategory = {
  ...savedSource,
  document: {
    ...savedSource.document,
    workCategory: "Other work",
    installmentGroupId: "other-category-plan",
  },
};
const anotherContract = {
  ...savedSource,
  document: { ...savedSource.document, installmentGroupId: "another-contract" },
};
const scope = savedWorkPlans(
  [savedSource, otherOwner, otherSite, otherCategory, anotherContract],
  savedSource.creditorId,
  savedSource.projectId,
  "",
);
assert.equal(
  scope.length,
  2,
  "Filter by creditor, site and work category; distinct contracts stay distinct",
);
const beforeWrongLink = saved.get("manage-from.workspace.v2");
assert.throws(
  () => addPayment({ ...planFirstPayment, id: "duplicate-installment" }),
  /งวดนี้บันทึกแล้ว/,
);
assert.throws(
  () => savePayment({ ...savedSource, creditorId: newCreditor.id }),
  /ชุดงานเดิม/,
);
assert.throws(
  () => savePayment({ ...savedSource, projectId: newProject.id }),
  /ชุดงานเดิม/,
);
assert.throws(
  () =>
    savePayment({
      ...savedSource,
      document: { ...savedSource.document, workCategory: "Wrong work" },
    }),
  /ชุดงานเดิม/,
);
assert.equal(
  saved.get("manage-from.workspace.v2"),
  beforeWrongLink,
  "Incorrect links do not overwrite stored records",
);
console.log(
  "Payment checks passed: legacy preservation, status groups, document calculations, round-trip editing and atomic new creditor/project creation.",
);
