import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { Printer } from "lucide-react";
import InvoiceDetailContent from "@/components/invoices/InvoiceDetailContent";
import InvoicePaymentsSection from "@/components/invoices/InvoicePaymentsSection";
import QueryBoundary from "@/components/ui/QueryBoundary";
import { getInvoice, getInvoicePayments } from "@/lib/api/invoices";
import { getPatient } from "@/lib/api/patients";
import { getRefundRequests } from "@/lib/api/refund-requests";
import { useEmployee } from "@/lib/auth/employee-context";

export default function InvoicePage() {
  const { id } = useParams();
  const invoiceId = Number(id);
  const employee = useEmployee();

  const invoice = useQuery({
    queryKey: ["invoices", "detail", invoiceId],
    queryFn: () => getInvoice(invoiceId),
  });
  const invoiceData = invoice.data;
  // Остальное зависит от счёта: пациент — от patientId, платежи и заявки на
  // возврат есть только у выставленного (не черновика).
  const issued = invoiceData !== undefined && invoiceData.status !== "draft";

  const patient = useQuery({
    queryKey: ["patients", "detail", String(invoiceData?.patientId)],
    queryFn: () => getPatient(String(invoiceData?.patientId)),
    enabled: invoiceData !== undefined,
  });
  const payments = useQuery({
    queryKey: ["invoices", "payments", invoiceId],
    queryFn: () => getInvoicePayments(invoiceId),
    enabled: issued,
  });
  const refundRequests = useQuery({
    queryKey: ["refund-requests", "list"],
    queryFn: () => getRefundRequests(),
    enabled: issued,
  });

  return (
    <QueryBoundary
      queries={[invoice, patient, payments, refundRequests]}
      notFoundMessage="Счёт не найден."
    >
      {invoiceData && patient.data && (
        <div className="mx-auto max-w-[900px] space-y-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs text-gray-400">
                <Link to="/" className="hover:text-gray-600">
                  Главная
                </Link>
                {" / "}
                <Link to={`/patients/${patient.data.id}`} className="hover:text-gray-600">
                  {patient.data.fullName}
                </Link>
                {" / "}
                <span className="text-gray-600">Счёт № {invoiceData.invoiceNumber}</span>
              </p>
              <h1 className="mt-1 text-[22px] font-semibold tracking-tight text-gray-900">
                Счёт для {patient.data.fullName}
              </h1>
            </div>
            {invoiceData.status !== "draft" && (
              <Link
                to={`/invoices/${invoiceData.id}/receipt`}
                className="flex shrink-0 items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50"
              >
                <Printer className="h-4 w-4" />
                Квитанция
              </Link>
            )}
          </div>

          <InvoiceDetailContent invoice={invoiceData} currentEmployeeRole={employee.role}>
            {invoiceData.status !== "draft" && invoiceData.status !== "cancelled" && (
              <InvoicePaymentsSection
                invoice={invoiceData}
                payments={payments.data ?? []}
                refundRequests={(refundRequests.data ?? []).filter(
                  (request) => request.invoiceId === invoiceData.id,
                )}
                currentEmployeeRole={employee.role}
              />
            )}
          </InvoiceDetailContent>
        </div>
      )}
    </QueryBoundary>
  );
}
