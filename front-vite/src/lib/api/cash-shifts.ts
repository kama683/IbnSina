import { apiGet, apiPost } from "./api";

export type CashShiftStatus = "open" | "closed";

export interface CashShift {
  id: number;
  cashierEmployeeId: number;
  cashierName: string | null;
  openedAt: string;
  openingBalance: number;
  closedAt: string | null;
  actualCash: number | null;
  status: CashShiftStatus;
}

export interface ShiftReport {
  shift: CashShift;
  cashTotal: number;
  cardTotal: number;
  transferTotal: number;
  refundsTotal: number;
  paymentsCount: number;
  expectedCash: number;
  discrepancy: number | null;
}

/** Этап 2, коммит 10 (docs/PHASE2_ANALYSIS.md) — кассовая смена. */
export function getCurrentShift(): Promise<CashShift | null> {
  return apiGet<CashShift | null>("/api/cash-shifts/current");
}

/** Этап 2, коммит 13 — список смен (reception видит свои, head_doctor — все). */
export function getShifts(): Promise<CashShift[]> {
  return apiGet<CashShift[]>("/api/cash-shifts");
}

export function openShift(openingBalance: number): Promise<CashShift> {
  return apiPost<CashShift>("/api/cash-shifts", { openingBalance });
}

export function closeShift(shiftId: number, actualCash: number): Promise<CashShift> {
  return apiPost<CashShift>(`/api/cash-shifts/${shiftId}/close`, { actualCash });
}

export function getShiftReport(shiftId: number): Promise<ShiftReport> {
  return apiGet<ShiftReport>(`/api/cash-shifts/${shiftId}/report`);
}
