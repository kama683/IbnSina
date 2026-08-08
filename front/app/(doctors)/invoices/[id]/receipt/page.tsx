import { notFound } from "next/navigation";
import ReceiptContent from "@/components/invoices/ReceiptContent";
import { ApiError } from "@/lib/api/api";
import { getInvoice, getInvoicePayments } from "@/lib/api/invoices";
import { getPatient } from "@/lib/api/patients";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function InvoiceReceiptPage({ params }: Props) {
  const { id } = await params;
  const invoiceId = Number(id);

  try {
    const invoice = await getInvoice(invoiceId);
    const [patient, payments] = await Promise.all([
      getPatient(String(invoice.patientId)),
      invoice.status === "draft" ? Promise.resolve([]) : getInvoicePayments(invoiceId),
    ]);

    return <ReceiptContent invoice={invoice} patient={patient} payments={payments} />;
  } catch (error) {
    if (error instanceof ApiError && (error.status === 404 || error.status === 403)) {
      notFound();
    }
    throw error;
  }
}
