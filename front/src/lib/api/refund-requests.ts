import { apiGet, apiPost } from "./api";

export type RefundRequestStatus = "pending" | "approved" | "rejected";

export interface RefundRequest {
  id: number;
  invoiceId: number;
  paymentId: number;
  amount: number;
  reason: string;
  requestedBy: string | null;
  status: RefundRequestStatus;
  createdAt: string;
  decidedBy: string | null;
  decidedAt: string | null;
  resultingPaymentId: number | null;
}

/** Этап 2, коммит 11 (docs/PHASE2_ANALYSIS.md) — заявки на возврат. */
export function getRefundRequests(
  status?: RefundRequestStatus,
  options: { mine?: boolean } = {},
): Promise<RefundRequest[]> {
  const params = new URLSearchParams();
  if (status) params.set("status", status);
  if (options.mine) params.set("mine", "true");
  const suffix = params.toString();
  return apiGet<RefundRequest[]>(`/api/refund-requests${suffix ? `?${suffix}` : ""}`);
}

export function createRefundRequest(
  paymentId: number,
  amount: number,
  reason: string,
): Promise<RefundRequest> {
  return apiPost<RefundRequest>("/api/refund-requests", { paymentId, amount, reason });
}

export function approveRefundRequest(id: number): Promise<RefundRequest> {
  return apiPost<RefundRequest>(`/api/refund-requests/${id}/approve`, {});
}

export function rejectRefundRequest(id: number): Promise<RefundRequest> {
  return apiPost<RefundRequest>(`/api/refund-requests/${id}/reject`, {});
}
