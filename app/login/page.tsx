import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getAccess } from "@/lib/access";
import { AuthForm } from "@/components/auth/auth-form";
export default async function LoginPage() {
  if (await getAccess(await headers())) redirect("/");
  return <AuthForm />;
}
