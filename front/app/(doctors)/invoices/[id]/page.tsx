import Link from "next/link";
import { notFound } from "next/navigation";
import InvoiceDetailContent from "@/components/invoices/InvoiceDetailContent";
import { ApiError } from "@/lib/api/api";
import { getCurrentEmployee } from "@/lib/api/employees";
import { getInvoice } from "@/lib/api/invoices";
import { getPatient } from "@/lib/api/patients";

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
    const patient = await getPatient(String(invoice.patientId));

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

        <InvoiceDetailContent invoice={invoice} currentEmployeeRole={employee.role} />
      </div>
    );
  } catch (error) {
    if (error instanceof ApiError && (error.status === 404 || error.status === 403)) {
      notFound();
    }
    throw error;
  }
}
