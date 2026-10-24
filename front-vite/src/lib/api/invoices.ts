import { apiGet, apiPatch, apiPost } from "./api";

export type InvoiceStatus = "draft" | "unpaid" | "partial" | "paid" | "refunded" | "cancelled";
export type PaymentMethod = "cash" | "card" | "transfer";

export interface InvoiceItem {
  id: number;
  serviceId: number;
  serviceName: string;
  priceSnapshot: number;
  quantity: number;
  discountAmount: number;
  lineTotal: number;
  performerEmployeeId: number | null;
}

export interface Invoice {
  id: number;
  invoiceNumber: string;
  patientId: number;
  appointmentId: number | null;
  status: InvoiceStatus;
  subtotal: number;
  discountTotal: number;
  total: number;
  discountApprovedBy: string | null;
  discountApprovedAt: string | null;
  createdBy: string | null;
  createdAt: string;
  cancelledAt: string | null;
  cancelledBy: string | null;
  cancellationReason: string | null;
  items: InvoiceItem[];
}

export interface Payment {
  id: number;
  invoiceId: number;
  amount: number;
  method: PaymentMethod;
  cashShiftId: number | null;
  createdBy: string | null;
  createdAt: string;
  reversalOfPaymentId: number | null;
  refundReason: string | null;
  approvedBy: string | null;
}

export type InvoiceItemInput = {
  serviceId: number;
  quantity: number;
  discountAmount?: number;
};

/** Этап 2, коммит 8 (docs/PHASE2_ANALYSIS.md) — счёт. */
export function getInvoices(patientId?: number): Promise<Invoice[]> {
  const suffix = patientId ? `?patientId=${patientId}` : "";
  return apiGet<Invoice[]>(`/api/invoices${suffix}`);
}

export function getInvoice(id: number): Promise<Invoice> {
  return apiGet<Invoice>(`/api/invoices/${id}`);
}

export function createInvoice(payload: {
  patientId: number;
  appointmentId?: number;
  items: InvoiceItemInput[];
  discountTotal?: number;
}): Promise<Invoice> {
  return apiPost<Invoice>("/api/invoices", payload);
}

export function updateInvoiceItems(
  invoiceId: number,
  items: InvoiceItemInput[],
  discountTotal: number,
): Promise<Invoice> {
  return apiPatch<Invoice>(`/api/invoices/${invoiceId}/items`, { items, discountTotal });
}

export function issueInvoice(invoiceId: number): Promise<Invoice> {
  return apiPost<Invoice>(`/api/invoices/${invoiceId}/issue`, {});
}

export function approveInvoiceDiscount(invoiceId: number): Promise<Invoice> {
  return apiPost<Invoice>(`/api/invoices/${invoiceId}/approve-discount`, {});
}

export function cancelInvoice(invoiceId: number, reason?: string): Promise<Invoice> {
  return apiPost<Invoice>(`/api/invoices/${invoiceId}/cancel`, { reason });
}

/** Этап 2, коммит 9. */
export function getInvoicePayments(invoiceId: number): Promise<Payment[]> {
  return apiGet<Payment[]>(`/api/invoices/${invoiceId}/payments`);
}

export function createInvoicePayment(
  invoiceId: number,
  amount: number,
  method: PaymentMethod,
): Promise<Payment> {
  return apiPost<Payment>(`/api/invoices/${invoiceId}/payments`, { amount, method });
}
