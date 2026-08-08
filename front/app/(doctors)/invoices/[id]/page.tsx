import Link from "next/link";
import { notFound } from "next/navigation";
import InvoiceDetailContent from "@/components/invoices/InvoiceDetailContent";
import InvoicePaymentsSection from "@/components/invoices/InvoicePaymentsSection";
import { ApiError } from "@/lib/api/api";
import { getCurrentEmployee } from "@/lib/api/employees";
import { getInvoice, getInvoicePayments } from "@/lib/api/invoices";
import { getPatient } from "@/lib/api/patients";
import { getRefundRequests } from "@/lib/api/refund-requests";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function InvoicePage({ params }: Props) {
  const { id } = await params;
  const invoiceId = Number(id);

  try {
    const [invoice, employee] = await Promise.all([
      getInvoice(invoiceId),
      getCurrentEmployee(),
    ]);
    const [patient, payments, allRefundRequests] = await Promise.all([
      getPatient(String(invoice.patientId)),
      invoice.status === "draft" ? Promise.resolve([]) : getInvoicePayments(invoiceId),
      invoice.status === "draft" ? Promise.resolve([]) : getRefundRequests(),
    ]);
    const refundRequests = allRefundRequests.filter((r) => r.invoiceId === invoice.id);

    return (
      <div className="mx-auto max-w-[900px] space-y-5">
        <div>
          <p className="text-xs text-gray-400">
            <Link href="/" className="hover:text-gray-600">
              Главная
            </Link>
            {" / "}
            <Link href={`/patients/${patient.id}`} className="hover:text-gray-600">
              {patient.fullName}
            </Link>
            {" / "}
            <span className="text-gray-600">Счёт № {invoice.invoiceNumber}</span>
          </p>
          <h1 className="mt-1 text-[22px] font-semibold tracking-tight text-gray-900">
            Счёт для {patient.fullName}
          </h1>
        </div>

        <InvoiceDetailContent invoice={invoice} currentEmployeeRole={employee.role}>
          {invoice.status !== "draft" && invoice.status !== "cancelled" && (
            <InvoicePaymentsSection
              invoice={invoice}
              payments={payments}
              refundRequests={refundRequests}
              currentEmployeeRole={employee.role}
            />
          )}
        </InvoiceDetailContent>
      </div>
    );
  } catch (error) {
    if (error instanceof ApiError && (error.status === 404 || error.status === 403)) {
      notFound();
    }
    throw error;
  }
}
