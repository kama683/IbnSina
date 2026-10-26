import { apiDelete, apiGet, apiPatch, apiPost } from "./api";

export type ServiceCategory = "consultation" | "procedure" | "analysis" | "other";

export interface Service {
  id: number;
  code: string;
  name: string;
  category: ServiceCategory;
  price: number;
  durationMinutes: number | null;
  isActive: boolean;
}

export type ServiceCreatePayload = {
  code: string;
  name: string;
  category: ServiceCategory;
  price: number;
  durationMinutes?: number;
};

export type ServiceUpdatePayload = Partial<{
  code: string;
  name: string;
  category: ServiceCategory;
  price: number;
  durationMinutes: number;
  isActive: boolean;
}>;

/** Этап 2, коммит 7 (docs/PHASE2_ANALYSIS.md) — прейскурант. */
export function getServices(includeInactive = false): Promise<Service[]> {
  const params = includeInactive ? "?includeInactive=true" : "";
  return apiGet<Service[]>(`/api/services${params}`);
}

export function createService(payload: ServiceCreatePayload): Promise<Service> {
  return apiPost<Service>("/api/services", payload);
}

export function updateService(id: number, payload: ServiceUpdatePayload): Promise<Service> {
  return apiPatch<Service>(`/api/services/${id}`, payload);
}

export function deleteService(id: number): Promise<{id: number}> {
  return apiDelete<{id: number }>(`/api/services/${id}`);
}