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
