import { CreditorTable } from "@/components/workspace/creditor-table";
import { isPaymentStatus } from "@/lib/payment-status";

export default async function CreditorPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ status?: string | string[] }>;
}) {
  const { id } = await params;
  const { status } = await searchParams;
  const initialStatus = isPaymentStatus(status) ? status : "all";
  return (
    <CreditorTable
      key={`${id}-${initialStatus}`}
      creditorId={id}
      initialStatus={initialStatus}
    />
  );
}
