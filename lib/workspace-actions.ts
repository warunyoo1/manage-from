import { isPaymentStatus } from '@/lib/payment-status';
import { isPaymentDocument, documentTotals } from '@/lib/payment-document';
import { normalizeCreditorName, parseWorkspace } from '@/lib/workspace-data';
import type { Creditor, Payment, Project, Workspace } from '@/types/workspace';
export type WorkspaceAction = {
    type: 'add-creditor';
    creditor: Creditor;
} | {
    type: 'toggle-favorite';
    id: string;
} | {
    type: 'add-payment';
    payment: Payment;
    newProject?: Project;
    newCreditor?: Creditor;
} | {
    type: 'save-payment';
    payment: Payment;
    newProject?: Project;
    newCreditor?: Creditor;
} | {
    type: 'update-payment';
    id: string;
    changes: Partial<Pick<Payment, 'status' | 'paidDate' | 'flow'>>;
};
export const emptyWorkspace: Workspace = { creditors: [], projects: [], payments: [] };
function assertEntity(value: Creditor | Project) {
    if (!value || typeof value !== 'object' ||
        !['id', 'name', 'description', 'color'].every((key) => typeof value[key as keyof typeof value] === 'string') ||
        !value.id.trim() || !value.name.trim() || typeof value.favorite !== 'boolean' ||
        !['blue', 'amber', 'purple', 'cyan', 'rose'].includes(value.color))
        throw new Error('ตรวจสอบข้อมูลเจ้าหนี้หรือหน้างานอีกครั้ง');
}
export function applyWorkspaceAction(data: Workspace, action: WorkspaceAction): Workspace {
    let next = data;
    function updateWorkspace(update: (data: Workspace) => Workspace) { next = update(data); }
    function toggleCreditorFavorite(id: string) {
        updateWorkspace((data) => ({
            ...data,
            creditors: data.creditors.map((creditor) => creditor.id === id
                ? { ...creditor, favorite: !creditor.favorite }
                : creditor),
        }));
    }
    function addCreditor(creditor: Creditor) {
        updateWorkspace((data) => {
            if (data.creditors.some((item) => normalizeCreditorName(item.name) ===
                normalizeCreditorName(creditor.name)))
                throw new Error("ชื่อเจ้าหนี้นี้มีอยู่แล้ว");
            return { ...data, creditors: [...data.creditors, creditor] };
        });
    }
    function addPayment(payment: Payment, newProject?: Project, newCreditor?: Creditor) {
        if (!isPaymentStatus(payment.status) ||
            !Number.isFinite(payment.amount) ||
            payment.amount <= 0 ||
            (payment.document && !isPaymentDocument(payment.document)))
            throw new Error("ตรวจสอบข้อมูลในเอกสารอีกครั้ง");
        updateWorkspace((data) => {
            if (data.payments.some((item) => item.id === payment.id))
                throw new Error("รายการนี้มีอยู่แล้ว");
            assertWorkLink(data, payment);
            const creditors = appendCreditor(data.creditors, newCreditor);
            const projects = newProject
                ? [...data.projects, newProject]
                : data.projects;
            const creditor = creditors.find((item) => item.id === payment.creditorId);
            if (!creditor ||
                !projects.some((project) => project.id === payment.projectId))
                throw new Error("ไม่พบเจ้าหนี้หรือโปรเจกต์ของรายการนี้");
            return {
                ...data,
                creditors,
                projects,
                payments: [
                    ...data.payments.map((item) => syncInstallmentPlan(item, payment)),
                    { ...payment, creditor: creditor.name },
                ],
            };
        });
    }
    function assertWorkLink(data: Workspace, payment: Payment) {
        const group = payment.document?.installmentGroupId;
        const previous = data.payments.find((item) => item.id === payment.id);
        if (previous?.document?.installmentGroupId &&
            previous.document.installmentGroupId !== group)
            throw new Error("เอกสารนี้อยู่ในชุดงานเดิม กรุณาสร้างชุดงานใหม่แยกต่างหาก");
        if (!group || !payment.document?.installments)
            return;
        const siblings = data.payments.filter((item) => item.document?.installmentGroupId === group);
        if (siblings.some((item) => item.creditorId !== payment.creditorId ||
            item.projectId !== payment.projectId ||
            normalizeCreditorName(item.document!.workCategory) !==
                normalizeCreditorName(payment.document!.workCategory)))
            throw new Error("เจ้าหนี้ หน้างาน และหมวดงานต้องเป็นของชุดงานเดิม");
        if (siblings.some((item) => item.id !== payment.id &&
            item.document!.installmentNumber ===
                payment.document!.installmentNumber))
            throw new Error("งวดนี้บันทึกแล้ว กรุณาเปิดแก้ไขเอกสารเดิม");
        const plan = payment.document.installments;
        if (plan[payment.document.installmentNumber - 1]?.paymentId !== payment.id)
            throw new Error("งวดที่เลือกไม่ตรงกับเอกสารตั้งเบิก");
        for (const item of siblings) {
            if (plan[item.document!.installmentNumber - 1]?.paymentId !== item.id)
                throw new Error("แผนนี้มีงวดที่บันทึกแล้ว กรุณาดึงแผนล่าสุดอีกครั้ง");
        }
        for (const [index, claim] of plan.entries()) {
            if (!claim.paymentId || claim.paymentId === payment.id)
                continue;
            const saved = siblings.find((item) => item.id === claim.paymentId);
            if (!saved ||
                saved.document!.installmentNumber !== index + 1 ||
                saved.document!.requestedAmount !== claim.amount ||
                saved.requestedDate !== claim.date)
                throw new Error("ข้อมูลของงวดที่บันทึกแล้วไม่ตรงกับชุดงาน กรุณาดึงแผนล่าสุด");
        }
    }
    function syncInstallmentPlan(existing: Payment, saved: Payment): Payment {
        const group = saved.document?.installmentGroupId;
        if (!group ||
            existing.document?.installmentGroupId !== group ||
            !saved.document?.installments)
            return existing;
        return {
            ...existing,
            installment: `${existing.document.installmentNumber}/${saved.document.totalInstallments}`,
            document: {
                ...existing.document,
                totalWorkAmount: saved.document.totalWorkAmount,
                installmentBaseClaimed: saved.document.installmentBaseClaimed,
                totalInstallments: saved.document.totalInstallments,
                installments: saved.document.installments.map((item) => ({ ...item })),
            },
        };
    }
    function appendCreditor(creditors: Creditor[], newCreditor?: Creditor) {
        if (!newCreditor)
            return creditors;
        if (!newCreditor.name.trim() ||
            creditors.some((item) => item.id === newCreditor.id ||
                normalizeCreditorName(item.name) ===
                    normalizeCreditorName(newCreditor.name)))
            throw new Error("ชื่อเจ้าหนี้นี้มีอยู่แล้ว เลือกชื่อเดิมจากรายการแนะนำ");
        return [...creditors, newCreditor];
    }
    function savePayment(payment: Payment, newProject?: Project, newCreditor?: Creditor) {
        if (!isPaymentStatus(payment.status) ||
            !Number.isFinite(payment.amount) ||
            payment.amount <= 0 ||
            (payment.document && !isPaymentDocument(payment.document)))
            throw new Error("ตรวจสอบข้อมูลในเอกสารอีกครั้ง");
        updateWorkspace((data) => {
            if (!data.payments.some((item) => item.id === payment.id))
                throw new Error("ไม่พบรายการนี้");
            assertWorkLink(data, payment);
            const projects = newProject
                ? [...data.projects, newProject]
                : data.projects;
            const creditors = appendCreditor(data.creditors, newCreditor);
            const creditor = creditors.find((item) => item.id === payment.creditorId);
            if (!creditor || !projects.some((item) => item.id === payment.projectId))
                throw new Error("ไม่พบเจ้าหนี้หรือโปรเจกต์ของรายการนี้");
            return {
                ...data,
                creditors,
                projects,
                payments: data.payments.map((item) => item.id === payment.id
                    ? { ...payment, creditor: creditor.name }
                    : syncInstallmentPlan(item, payment)),
            };
        });
    }
    function updatePayment(id: string, changes: Partial<Pick<Payment, "status" | "paidDate" | "flow">>) {
        if (changes.status !== undefined && !isPaymentStatus(changes.status))
            throw new Error("ไม่พบสถานะนี้");
        updateWorkspace((data) => ({
            ...data,
            payments: data.payments.map((payment) => payment.id === id ? { ...payment, ...changes } : payment),
        }));
    }
    if (!action || typeof action !== 'object')
        throw new Error('ไม่พบรายการที่ต้องการบันทึก');
    switch (action.type) {
        case 'add-creditor':
            assertEntity(action.creditor);
            addCreditor(action.creditor);
            break;
        case 'toggle-favorite':
            if (!data.creditors.some((item) => item.id === action.id))
                throw new Error('ไม่พบเจ้าหนี้นี้');
            toggleCreditorFavorite(action.id);
            break;
        case 'add-payment':
        case 'save-payment': {
            let p = action.payment;
            if (!p || typeof p !== 'object')
                throw new Error('ตรวจสอบข้อมูลรายการอีกครั้ง');
            if (action.newCreditor)
                assertEntity(action.newCreditor);
            if (action.newProject) {
                assertEntity(action.newProject);
                if (data.projects.some((item) => normalizeCreditorName(item.name) === normalizeCreditorName(action.newProject!.name)))
                    throw new Error('หน้างานนี้มีอยู่แล้ว กรุณาเลือกหน้างานเดิม');
            }
            if (p.document) {
                if (!isPaymentDocument(p.document))
                    throw new Error('ตรวจสอบข้อมูลเอกสารอีกครั้ง');
                if (p.document.installments) {
                    const doc = p.document;
                    const active = doc.installments![doc.installmentNumber - 1];
                    if (!doc.installmentGroupId || active.amount !== doc.requestedAmount || active.date !== p.requestedDate ||
                        p.installment !== `${doc.installmentNumber}/${doc.totalInstallments}`)
                        throw new Error('งวดที่เลือกไม่ตรงกับเอกสารตั้งเบิก');
                    const previousClaimed = Math.round((doc.installmentBaseClaimed ?? 0) * 100 +
                        doc.installments!.reduce((sum, item, index) => sum + (item.paymentId && index !== doc.installmentNumber - 1 ? Math.round(item.amount * 100) : 0), 0)) / 100;
                    p = { ...p, document: { ...doc, previousClaimed } };
                }
                const savedDocument = p.document!;
                const totals = documentTotals(savedDocument);
                if (Math.abs(totals.net - p.amount) > 0.005 || totals.net <= 0 || totals.remaining < 0 ||
                    (savedDocument.installments && savedDocument.installments.reduce((sum, item) => sum + item.amount, savedDocument.installmentBaseClaimed ?? 0) > savedDocument.totalWorkAmount + 0.005))
                    throw new Error('ยอดเงินในเอกสารไม่ถูกต้องหรือเกินมูลค่างาน');
            }
            if (action.type === 'add-payment')
                addPayment(p, action.newProject, action.newCreditor);
            else
                savePayment(p, action.newProject, action.newCreditor);
            break;
        }
        case 'update-payment':
            if (!data.payments.some((item) => item.id === action.id))
                throw new Error('ไม่พบรายการนี้');
            if (!action.changes || typeof action.changes !== 'object' || Object.keys(action.changes).some((key) => !['status', 'paidDate', 'flow'].includes(key)))
                throw new Error('ไม่สามารถแก้ไขข้อมูลส่วนนี้ได้');
            updatePayment(action.id, action.changes);
            break;
        default: throw new Error('ไม่พบคำสั่งนี้');
    }
    const validated = parseWorkspace(next);
    if (!validated || [next.creditors, next.projects, next.payments].some((items) => new Set(items.map((item) => item.id)).size !== items.length))
        throw new Error('ข้อมูลไม่ครบหรือรหัสรายการซ้ำ');
    return validated;
}
