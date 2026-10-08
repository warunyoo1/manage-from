"use client";
import { useEffect, useSyncExternalStore } from "react";
import { emptyWorkspace, type WorkspaceAction } from "@/lib/workspace-actions";
import { parseWorkspace } from "@/lib/workspace-data";
import type { Creditor, Payment, Project, Workspace } from "@/types/workspace";
type Snapshot = {
    workspace: Workspace;
    revision: number;
    loading: boolean;
    saving: boolean;
    connected: boolean;
    error: string;
};
const initialSnapshot: Snapshot = {
    workspace: emptyWorkspace, revision: 0, loading: true, saving: false,
    connected: false, error: "",
};
let snapshot = initialSnapshot;
let refreshing: Promise<void> | null = null;
let initialized = false;
const listeners = new Set<() => void>();
function publish(changes: Partial<Snapshot>) {
    snapshot = { ...snapshot, ...changes };
    listeners.forEach((listener) => listener());
}
async function responseData(response: Response) {
    if (response.status === 401 || response.status === 403) {
        const denial = await response.clone().json().catch(() => null);
        clearWorkspace();
        window.location.replace(denial?.error?.code === "PASSWORD_CHANGE_REQUIRED" ? "/account" : "/login");
        throw new Error("กรุณาเข้าสู่ระบบอีกครั้ง");
    }
    const body = await response.json();
    if (!response.ok || body.success !== true)
        throw new Error(body.error?.message || "เชื่อมต่อฐานข้อมูลไม่ได้ กรุณาลองอีกครั้ง");
    const workspace = parseWorkspace(body.data?.workspace);
    if (!workspace || !Number.isInteger(body.data.revision))
        throw new Error("อ่านข้อมูลไม่สำเร็จ กรุณาลองอีกครั้ง");
    return { workspace, revision: body.data.revision as number };
}
export function clearWorkspace() {
    snapshot = { ...initialSnapshot, loading: false };
    initialized = false;
    listeners.forEach((listener) => listener());
}
export function refreshWorkspace() {
    if (refreshing)
        return refreshing;
    if (snapshot.saving)
        return Promise.resolve();
    publish({ loading: true });
    refreshing = (async () => {
        try {
            const response = await fetch("/api/workspace", { cache: "no-store" });
            publish({ ...await responseData(response), connected: true, error: "", loading: false });
        }
        catch (cause) {
            publish({ loading: false, connected: false, error: cause instanceof Error ? cause.message : "เชื่อมต่อฐานข้อมูลไม่ได้" });
        }
        finally {
            refreshing = null;
        }
    })();
    return refreshing;
}
function onFocus() { if (!snapshot.saving)
    void refreshWorkspace(); }
function subscribe(listener: () => void) {
    listeners.add(listener);
    if (listeners.size === 1)
        window.addEventListener("focus", onFocus);
    return () => {
        listeners.delete(listener);
        if (!listeners.size)
            window.removeEventListener("focus", onFocus);
    };
}
export function useWorkspace() {
    const state = useSyncExternalStore(subscribe, () => snapshot, () => initialSnapshot);
    useEffect(() => {
        if (initialized)
            return;
        initialized = true;
        void refreshWorkspace();
    }, []);
    return state;
}
async function dispatch(action: WorkspaceAction) {
    if (snapshot.loading || snapshot.saving)
        throw new Error("กำลังโหลดหรือบันทึกข้อมูล กรุณารอสักครู่");
    if (!snapshot.connected)
        throw new Error("ยังเชื่อมต่อฐานข้อมูลไม่ได้ กรุณาลองเชื่อมต่ออีกครั้ง");
    publish({ saving: true, error: "" });
    let conflict = false;
    try {
        const response = await fetch("/api/workspace", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action, revision: snapshot.revision }),
        });
        conflict = response.status === 409;
        publish({ ...await responseData(response), connected: true });
    }
    catch (cause) {
        const message = cause instanceof Error ? cause.message : "บันทึกไม่สำเร็จ กรุณาลองอีกครั้ง";
        publish({ error: message });
        throw new Error(message);
    }
    finally {
        publish({ saving: false });
        if (conflict)
            await refreshWorkspace();
    }
}
export const addCreditor = (creditor: Creditor) => dispatch({ type: "add-creditor", creditor });
export const toggleCreditorFavorite = (id: string) => dispatch({ type: "toggle-favorite", id });
export const addPayment = (payment: Payment, newProject?: Project, newCreditor?: Creditor) => dispatch({ type: "add-payment", payment, newProject, newCreditor });
export const savePayment = (payment: Payment, newProject?: Project, newCreditor?: Creditor) => dispatch({ type: "save-payment", payment, newProject, newCreditor });
export const updatePayment = (id: string, changes: Partial<Pick<Payment, "status" | "paidDate" | "flow">>) => dispatch({ type: "update-payment", id, changes });
