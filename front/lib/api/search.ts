import { apiGet } from "./api";

export type SearchPatientResult = {
  id: string;
  fullName: string;
  shortName: string;
  iin: string;
};

export type SearchAppointmentResult = {
  id: string;
  patientId: string;
  patient: string;
  date: string;
  time: string;
  complaint: string;
  status: string;
};

export type GlobalSearchResult = {
  patients: SearchPatientResult[];
  appointments: SearchAppointmentResult[];
};

export function globalSearch(query: string): Promise<GlobalSearchResult> {
  const params = new URLSearchParams({ q: query });
  return apiGet<GlobalSearchResult>(`/api/search?${params}`);
}
