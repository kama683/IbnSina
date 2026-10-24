import { apiGet } from "./api";

export interface DailyReport {
  date: string;
  cashTotal: number;
  cardTotal: number;
  transferTotal: number;
  total: number;
  refundsTotal: number;
  paymentsCount: number;
  invoicesTouchedCount: number;
}

/** Этап 2, коммит 13 (docs/PHASE2_ANALYSIS.md) — дневной отчёт по клинике. */
export function getDailyReport(date: string): Promise<DailyReport> {
  return apiGet<DailyReport>(`/api/reports/daily?date=${date}`);
}

/** Сводка рабочего места регистратуры одним запросом
 * (GET /api/reports/reception-summary). Суммы — в тиынах. */
export interface ReceptionSummary {
  date: string;
  /** Открытая смена текущего сотрудника; null — смена не открыта. */
  shift: { id: number; openedAt: string; receivedTotal: number } | null;
  queue: { waiting: number; inProgress: number };
  doctors: {
    employeeId: number;
    shortName: string;
    office: string;
    inProgress: boolean;
    waiting: number;
  }[];
  invoices: {
    /** Счета в статусах unpaid и partial. */
    unpaidCount: number;
    /** Черновики, у которых скидка выше порога ждёт главврача. */
    awaitingApprovalCount: number;
    awaitingPayment: {
      id: number;
      number: string;
      patientId: number;
      patientName: string | null;
      total: number;
      paidAmount: number;
      status: "unpaid" | "partial" | "draft";
      awaitingApproval: boolean;
    }[];
  };
}

export function getReceptionSummary(): Promise<ReceptionSummary> {
  return apiGet<ReceptionSummary>("/api/reports/reception-summary");
}
