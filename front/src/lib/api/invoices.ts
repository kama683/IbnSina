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

/** Строка списка счетов: к счёту добавлены имя пациента, оплаченная сумма и
 * признак «скидка выше порога ждёт главврача» (только у черновика). */
export interface InvoiceListRow extends Invoice {
  patientName: string | null;
  paidAmount: number;
  awaitingApproval: boolean;
}

export type InvoiceListQuery = {
  patientId?: number;
  status?: InvoiceStatus[];
  /** Даты создания включительно, YYYY-MM-DD. */
  from?: string;
  to?: string;
  limit?: number;
  offset?: number;
};

/** Этап 2, коммит 8 (docs/PHASE2_ANALYSIS.md) — счёт. Без limit бэкенд отдаёт
 * все счета клиники — для экранов используйте limit (и limit+1, чтобы узнать,
 * есть ли следующая страница). */
export function getInvoices(query: InvoiceListQuery = {}): Promise<InvoiceListRow[]> {
  const params = new URLSearchParams();
  if (query.patientId) params.set("patientId", String(query.patientId));
  if (query.status?.length) params.set("status", query.status.join(","));
  if (query.from) params.set("from", query.from);
  if (query.to) params.set("to", query.to);
  if (query.limit) params.set("limit", String(query.limit));
  if (query.offset) params.set("offset", String(query.offset));
  const suffix = params.toString();
  return apiGet<InvoiceListRow[]>(`/api/invoices${suffix ? `?${suffix}` : ""}`);
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
