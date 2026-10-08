import type { ReactNode } from "react";
import { requirePageAccess } from "@/lib/access";
import { AccountProvider } from "@/components/auth/account-provider";
export default async function WorkspaceLayout({ children }: { children: ReactNode }) {
  const { user, member } = await requirePageAccess();
  return <AccountProvider user={{ id: user.id, name: user.name, email: user.email, role: member.role }}>{children}</AccountProvider>;
}
