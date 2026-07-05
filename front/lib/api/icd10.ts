import { apiGet } from "./api";
import type { Diagnosis } from "@/lib/types";

export function searchIcd10(query: string): Promise<Diagnosis[]> {
  const params = new URLSearchParams({ q: query });
  return apiGet<Diagnosis[]>(`/api/icd10?${params}`);
}
