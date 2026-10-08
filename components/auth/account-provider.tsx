"use client";
import { createContext, useContext, type ReactNode } from "react";
type Account = { id: string; name: string; email: string; role: "owner" | "member"; mustChangePassword?: boolean };
const AccountContext = createContext<Account | null>(null);
export function AccountProvider({ user, children }: { user: Account; children: ReactNode }) {
  return <AccountContext.Provider value={user}>{children}</AccountContext.Provider>;
}
export const useAccount = () => useContext(AccountContext);
