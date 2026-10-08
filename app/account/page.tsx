import { AccountSettings } from "@/components/auth/account-settings";
import { AccountProvider } from "@/components/auth/account-provider";
import { requirePageAccess } from "@/lib/access";
export default async function AccountPage() {
  const { user, member } = await requirePageAccess(true);
  return <AccountProvider user={{ id: user.id, name: user.name, email: user.email, role: member.role, mustChangePassword: !!member.mustChangePassword }}><AccountSettings /></AccountProvider>;
}
