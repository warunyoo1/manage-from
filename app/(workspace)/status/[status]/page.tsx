import { notFound } from "next/navigation";
import { CreditorTable } from "@/components/workspace/creditor-table";
import { paymentStatuses } from "@/lib/payment-status";

export default async function StatusPage({
  params,
}: {
  params: Promise<{ status: string }>;
}) {
  const { status } = await params;
  const selected = paymentStatuses.find((item) => item.slug === status);
  if (!selected) notFound();
  return <CreditorTable key={selected.slug} fixedStatus={selected.value} />;
}
