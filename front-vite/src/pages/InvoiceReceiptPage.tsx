import { useQuery } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import ReceiptContent from "@/components/invoices/ReceiptContent";
import QueryBoundary from "@/components/ui/QueryBoundary";
import { getInvoice, getInvoicePayments } from "@/lib/api/invoices";
import { getPatient } from "@/lib/api/patients";

export default function InvoiceReceiptPage() {
  const { id } = useParams();
  const invoiceId = Number(id);

  const invoice = useQuery({
    queryKey: ["invoices", "detail", invoiceId],
    queryFn: () => getInvoice(invoiceId),
  });
  const invoiceData = invoice.data;

  const patient = useQuery({
    queryKey: ["patients", "detail", String(invoiceData?.patientId)],
    queryFn: () => getPatient(String(invoiceData?.patientId)),
    enabled: invoiceData !== undefined,
  });
  const payments = useQuery({
    queryKey: ["invoices", "payments", invoiceId],
    queryFn: () => getInvoicePayments(invoiceId),
    enabled: invoiceData !== undefined && invoiceData.status !== "draft",
  });

  return (
    <QueryBoundary queries={[invoice, patient, payments]} notFoundMessage="Счёт не найден.">
      {invoiceData && patient.data && (
        <ReceiptContent
          invoice={invoiceData}
          patient={patient.data}
          payments={payments.data ?? []}
        />
      )}
    </QueryBoundary>
  );
}
