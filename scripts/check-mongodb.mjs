import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import ts from 'typescript';
const dependencyRequire = createRequire(import.meta.url);
dependencyRequire('@next/env').loadEnvConfig(process.cwd());
const cache = new Map();
function load(relative) {
  const filename = path.resolve(relative);
  if (cache.has(filename)) return cache.get(filename).exports;
  const loaded = { exports: {} };
  cache.set(filename, loaded);
  const source = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;
  new Function('require', 'module', 'exports', source)(
    (id) => id === 'server-only' ? {} : id.startsWith('@/') ? load(`${id.slice(2)}.ts`) : dependencyRequire(id),
    loaded, loaded.exports,
  );
  return loaded.exports;
}
const mongoose = dependencyRequire('mongoose');
const { readWorkspace, writeWorkspace, WorkspaceConflict, WorkspaceValidationError } = load('lib/workspace-repository.ts');
const { defaultDocument, documentForInstallment, documentTotals } = load('lib/payment-document.ts');
const scopeId = `integration-${randomUUID()}`;
try {
  const before = await readWorkspace(scopeId);
  assert.equal(before.revision, 0);
  const creditor = { id: 'test-creditor', name: 'Integration test creditor', description: '', color: 'cyan', favorite: false };
  const project = { id: 'test-site', name: 'Integration test site', description: '', color: 'cyan', favorite: false };
  const first = await writeWorkspace({ type: 'add-creditor', creditor }, 0, scopeId);
  assert.equal(first.revision, 1);
  const plan = Array.from({ length: 4 }, (_, i) => ({ id: `test-plan-${i + 1}`, amount: 1000, date: '2026-10-04', ...(i === 0 ? { paymentId: 'test-payment-1' } : {}) }));
  const template = { ...defaultDocument(), totalWorkAmount: 4000, workCategory: 'Test work', installmentGroupId: 'test-group', installmentBaseClaimed: 0, installments: plan };
  const doc1 = documentForInstallment(template, plan, 1);
  const payment = {
    id: 'test-payment-1', creditorId: creditor.id, creditor: creditor.name, projectId: project.id,
    requestedDate: '2026-10-04', description: 'Integration fixture', installment: '1/4', nationality: 'ไทย', category: 'ค่าแรง', status: 'ค้างจ่าย',
    bank: '', branch: '', accountNumber: '', accountName: '', paidDate: '', amount: documentTotals(doc1).net, note: '', flow: false, document: doc1,
  };
  const claim1 = await writeWorkspace({ type: 'add-payment', payment, newProject: project }, first.revision, scopeId);
  assert.equal(claim1.workspace.payments.length, 1);
  assert.equal((await readWorkspace(scopeId)).workspace.payments[0].amount, 970);
  const plan2 = plan.map((entry, i) => i === 1 ? { ...entry, paymentId: 'test-payment-2' } : entry);
  const doc2 = { ...documentForInstallment(template, plan2, 2), installments: plan2 };
  const payment2 = { ...payment, id: 'test-payment-2', installment: '2/4', document: doc2, amount: documentTotals(doc2).net };
  const claim2 = await writeWorkspace({ type: 'add-payment', payment: payment2 }, claim1.revision, scopeId);
  const restored = await readWorkspace(scopeId);
  assert.equal(restored.workspace.payments.length, 2);
  assert.equal(restored.workspace.payments[0].document.installments[1].paymentId, payment2.id);
  assert.equal(restored.workspace.payments[1].document.previousClaimed, 1000);
  await assert.rejects(() => writeWorkspace({ type: 'add-payment', payment: { ...payment2, id: 'duplicate' } }, restored.revision, scopeId), WorkspaceValidationError);
  await assert.rejects(() => writeWorkspace({ type: 'save-payment', payment: { ...payment2, amount: 123 } }, restored.revision, scopeId), WorkspaceValidationError);
  const results = await Promise.allSettled([
    writeWorkspace({ type: 'update-payment', id: payment.id, changes: { flow: true } }, claim2.revision, scopeId),
    writeWorkspace({ type: 'update-payment', id: payment2.id, changes: { status: 'ตรวจสอบเพิ่มเติม' } }, claim2.revision, scopeId),
  ]);
  assert.equal(results.filter((r) => r.status === 'fulfilled').length, 1);
  const rejected = results.find((r) => r.status === 'rejected');
  assert.ok(rejected.reason instanceof WorkspaceConflict);
  const afterRace = await readWorkspace(scopeId);
  assert.equal(afterRace.revision, claim2.revision + 1);
  const updated = await writeWorkspace({ type: 'update-payment', id: payment2.id, changes: { status: 'จ่ายแล้ว', paidDate: '2026-10-04', flow: true } }, afterRace.revision, scopeId);
  assert.equal((await readWorkspace(scopeId)).workspace.payments[1].status, 'จ่ายแล้ว');
  assert.equal(updated.workspace.payments[1].flow, true);
  await assert.rejects(() => writeWorkspace({ type: 'import', workspace: restored.workspace }, updated.revision, scopeId), WorkspaceValidationError);
  console.log('MongoDB integration passed: read/write, linked installments, validation, concurrent-write protection, status/date/Flow updates and legacy import disabled.');
} catch (error) {
  console.error(`MongoDB integration failed (${error?.name || 'Error'}). Connection details omitted.`);
  process.exitCode = 1;
} finally {
  try {
    if (mongoose.connection.db) {
      const records = mongoose.connection.db.collection('workspaces');
      await records.deleteOne({ _id: scopeId });
      assert.equal(await records.countDocuments({ _id: scopeId }), 0);
      console.log('Only records created by this test were removed.');
    }
  } catch { console.error('Test fixture cleanup failed.'); process.exitCode = 1; }
  await mongoose.disconnect();
}
