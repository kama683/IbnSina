import { apiGet } from "./api";

export interface AuthUser {
  id: number;
  email: string;
  fullName: string;
  role: string;
  doctorId: number | null;
}

/** Текущий пользователь (пока без логина — первый user из БД). */
export function getAuthUser(): Promise<AuthUser> {
  return apiGet<AuthUser>("/api/auth/me");
}
