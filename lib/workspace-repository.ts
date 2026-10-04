import "server-only";
import { connectDB } from "@/lib/db";
import { applyWorkspaceAction, emptyWorkspace, type WorkspaceAction } from "@/lib/workspace-actions";
import { parseWorkspace } from "@/lib/workspace-data";
import type { Workspace } from "@/types/workspace";
type StoredWorkspace = {
    _id: string;
    state: Workspace;
    revision: number;
    updatedAt: Date;
};
export class WorkspaceConflict extends Error {
}
export class WorkspaceValidationError extends Error {
}
async function collection() {
    const db = await connectDB();
    if (!db.connection.db)
        throw new Error("Database unavailable");
    return db.connection.db.collection<StoredWorkspace>("workspaces");
}
export async function readWorkspace(id = "main") {
    const stored = await (await collection()).findOne({ _id: id });
    if (!stored)
        return { workspace: emptyWorkspace, revision: 0 };
    const workspace = parseWorkspace(stored.state);
    if (!workspace || !Number.isInteger(stored.revision))
        throw new Error("Invalid stored workspace");
    return { workspace, revision: stored.revision };
}
/** A single conditional write keeps payment, owner, site and installment plan atomic. */
export async function writeWorkspace(action: WorkspaceAction, expectedRevision: number, id = "main") {
    if (!Number.isInteger(expectedRevision) || expectedRevision < 0)
        throw new WorkspaceValidationError("ข้อมูลเวอร์ชันไม่ถูกต้อง");
    const current = await readWorkspace(id);
    if (current.revision !== expectedRevision)
        throw new WorkspaceConflict("มีข้อมูลใหม่ กรุณาลองบันทึกอีกครั้ง");
    let next: Workspace;
    try {
        next = applyWorkspaceAction(current.workspace, action);
    }
    catch (error) {
        throw new WorkspaceValidationError(error instanceof Error && !(error instanceof TypeError) ? error.message : "ข้อมูลไม่ถูกต้อง");
    }
    const records = await collection();
    if (current.revision === 0) {
        try {
            await records.insertOne({ _id: id, state: next, revision: 1, updatedAt: new Date() });
        }
        catch (error) {
            if (error && typeof error === "object" && "code" in error && error.code === 11000)
                throw new WorkspaceConflict("มีข้อมูลใหม่ กรุณาลองบันทึกอีกครั้ง");
            throw error;
        }
    }
    else {
        const result = await records.updateOne({ _id: id, revision: expectedRevision }, { $set: { state: next, updatedAt: new Date() }, $inc: { revision: 1 } });
        if (result.matchedCount !== 1)
            throw new WorkspaceConflict("มีข้อมูลใหม่ กรุณาลองบันทึกอีกครั้ง");
    }
    return { workspace: next, revision: current.revision + 1 };
}
